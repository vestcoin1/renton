import { Hono } from "hono";
import { isRefundEligible, rentPlanProgress } from "renton-core/tenancy-rules";
import { formatDate, formatNaira } from "renton-core/utils";
import { z } from "zod";
import { requireUser } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";
import { codes, uniqueCode } from "../lib/codes.js";
import { ApiError } from "../lib/errors.js";
import { body, naira, query } from "../lib/validate.js";
import {
  invoiceInclude,
  leaseInclude,
  profileInclude,
  propertyInclude,
  rentPlanInclude,
  toInvoice,
  toLease,
  toProperty,
  toRefund,
  toRentPlan,
  toUser,
} from "../mappers.js";
import { ADMINS, notify, type NewNotification } from "../services/notifications.js";
import { presentInvoice, presentRentPlan } from "../services/present.js";
import { addYears, assertTransition, loadLease, loadRentPlan } from "../services/tenancy.js";
import { uniqueById } from "./applications.js";

const reasonSchema = z.object({ reason: z.string().trim().min(3).max(500) });

export const adminPayments = new Hono<AppEnv>()
  .use(requireUser("admin"))

  // ─── Move-in invoices ───

  .get("/invoices", async (c) => {
    const { db, storage } = c.get("deps");
    const { status } = query(c, z.object({ status: z.enum(["awaiting_payment", "submitted", "verified", "rejected"]).optional() }));
    const rows = await db.paymentInvoice.findMany({
      where: { status },
      include: { ...invoiceInclude, property: { include: propertyInclude }, tenant: { include: profileInclude } },
      orderBy: { createdAt: "desc" },
    });
    return c.json({
      items: await Promise.all(rows.map((r) => presentInvoice(storage, toInvoice(r)))),
      properties: uniqueById(rows.map((r) => toProperty(r.property))),
      tenants: uniqueById(rows.map((r) => toUser(r.tenant))),
    });
  })

  /**
   * Receipt checked against the bank statement → the tenancy starts: a lease from the agreed move-in
   * date for the agreed term, the home marked occupied, other pending applicants closed, both parties told.
   */
  .post("/invoices/:id/verify", async (c) => {
    const { db, storage, now } = c.get("deps");
    const admin = c.get("user");
    const inv = await db.paymentInvoice.findUnique({ where: { id: c.req.param("id") }, include: { application: true, property: true, tenant: true, receipt: true } });
    if (!inv) throw ApiError.notFound("Invoice");
    if (inv.status !== "submitted") throw ApiError.conflict("There's no receipt waiting for verification on this invoice.", "invalid_status");
    if (!inv.application) throw ApiError.rule("no_application", "This invoice isn't linked to an application, so no lease can be created.");
    const app = inv.application;
    const at = now();
    const receiptNumber = await uniqueCode(codes.receiptNumber, async (n) => !!(await db.paymentInvoice.findUnique({ where: { receiptNumber: n }, select: { id: true } })));
    const agreementNumber = await uniqueCode(
      () => codes.agreementNumber(at.getUTCFullYear()),
      async (n) => !!(await db.paymentInvoice.findUnique({ where: { agreementNumber: n }, select: { id: true } })),
    );

    const updated = await db.$transaction(async (tx) => {
      const lease = await tx.lease.create({
        data: {
          propertyId: inv.propertyId,
          tenantId: inv.tenantId,
          unit: "Main unit",
          leaseStart: app.moveInDate,
          leaseEnd: addYears(app.moveInDate, app.leaseYears),
          annualRent: inv.property.rent,
          status: "active",
          lastPaymentAt: inv.receipt?.paidOn ?? at,
          createdAt: at,
        },
      });
      assertTransition(
        (
          await tx.paymentInvoice.updateMany({
            where: { id: inv.id, status: "submitted" },
            data: { status: "verified", verifiedAt: at, verifiedById: admin.id, receiptNumber, agreementNumber, leaseId: lease.id },
          })
        ).count,
      );
      await tx.property.update({ where: { id: inv.propertyId }, data: { occupancy: "occupied" } });
      const rivals = await tx.application.findMany({ where: { propertyId: inv.propertyId, status: "pending", id: { not: app.id } }, select: { id: true, tenantId: true } });
      await tx.application.updateMany({
        where: { id: { in: rivals.map((r) => r.id) } },
        data: { status: "rejected", updatedAt: at, landlordNote: "This home has now been let to another applicant." },
      });
      await notify(tx, at, [
        [
          inv.tenantId,
          {
            title: "Payment verified · welcome home 🔑",
            body: `Your tenancy agreement and payment receipt for ${inv.property.title} are ready to download from your profile.`,
            kind: "payment",
            href: "/tenant/profile#documents",
          },
        ],
        [
          inv.landlordId,
          {
            title: "Payment verified · tenancy started",
            body: `${inv.tenant.name} has paid for ${inv.property.title}. The property is now marked occupied.`,
            kind: "payment",
            href: "/landlord/tenants",
          },
        ],
        ...rivals.map((r): [string, NewNotification] => [
          r.tenantId,
          { title: "Application update", body: `${inv.property.title} has been let to another applicant.`, kind: "application", href: "/tenant/applications" },
        ]),
      ]);
      return tx.paymentInvoice.findUniqueOrThrow({ where: { id: inv.id }, include: invoiceInclude });
    });
    return c.json({ invoice: await presentInvoice(storage, toInvoice(updated)), lease: (await loadLease(db, updated.leaseId!)).lease });
  })

  .post("/invoices/:id/reject", async (c) => {
    const { db, storage, now } = c.get("deps");
    const { reason } = await body(c, reasonSchema);
    const inv = await db.paymentInvoice.findUnique({ where: { id: c.req.param("id") } });
    if (!inv) throw ApiError.notFound("Invoice");
    const at = now();
    const updated = await db.$transaction(async (tx) => {
      assertTransition((await tx.paymentInvoice.updateMany({ where: { id: inv.id, status: "submitted" }, data: { status: "rejected", rejectionReason: reason } })).count, "There's no receipt waiting for verification on this invoice.");
      await notify(tx, at, [[inv.tenantId, { title: "We couldn't verify your payment", body: `${reason} Please upload a new receipt.`, kind: "payment", href: "/tenant/payments" }]]);
      return tx.paymentInvoice.findUniqueOrThrow({ where: { id: inv.id }, include: invoiceInclude });
    });
    return c.json({ invoice: await presentInvoice(storage, toInvoice(updated)) });
  })

  // ─── Caution refunds ───

  .get("/refunds", async (c) => {
    const { db } = c.get("deps");
    const { status } = query(c, z.object({ status: z.enum(["requested", "approved", "paid"]).optional() }));
    const rows = await db.cautionRefund.findMany({
      where: { status },
      include: { property: { include: propertyInclude }, tenant: { include: profileInclude }, lease: { include: leaseInclude } },
      orderBy: { requestedAt: "desc" },
    });
    return c.json({
      items: rows.map(toRefund),
      properties: uniqueById(rows.map((r) => toProperty(r.property))),
      tenants: uniqueById(rows.map((r) => toUser(r.tenant))),
      leases: uniqueById(rows.map((r) => toLease(r.lease))),
    });
  })

  /** Blocked until REFUND_WAIT_DAYS after the move-out notice, enforced here as well as in the UI. */
  .post("/refunds/:id/approve", async (c) => {
    const { db, now } = c.get("deps");
    const { deduction } = await body(c, z.object({ deduction: z.object({ amount: naira, reason: z.string().trim().min(3).max(500) }).optional() }));
    const r = await db.cautionRefund.findUnique({ where: { id: c.req.param("id") } });
    if (!r) throw ApiError.notFound("Refund");
    if (r.status !== "requested") throw ApiError.conflict("This refund has already been approved.", "invalid_status");
    const at = now();
    if (!isRefundEligible(r.eligibleFrom.toISOString(), at.getTime())) {
      throw ApiError.rule("refund_not_eligible", `Refunds can be approved from ${formatDate(r.eligibleFrom.toISOString())}.`, { eligibleFrom: r.eligibleFrom.toISOString() });
    }
    if (deduction && deduction.amount > r.amount) throw ApiError.badRequest("The deduction can't exceed the deposit.");
    const applied = deduction && deduction.amount > 0 ? deduction : null;
    const updated = await db.$transaction(async (tx) => {
      assertTransition(
        (
          await tx.cautionRefund.updateMany({
            where: { id: r.id, status: "requested" },
            data: { status: "approved", approvedAt: at, deductionAmount: applied?.amount ?? null, deductionReason: applied?.reason ?? null },
          })
        ).count,
      );
      await notify(tx, at, [
        [
          r.tenantId,
          {
            title: "Caution refund approved",
            body: `${formatNaira(r.amount - (applied?.amount ?? 0))} will be paid to ${r.bankName} ${r.accountNumber}.${applied ? ` Deduction: ${applied.reason}` : ""}`,
            kind: "payment",
            href: "/tenant/home",
          },
        ],
      ]);
      return tx.cautionRefund.findUniqueOrThrow({ where: { id: r.id } });
    });
    return c.json({ refund: toRefund(updated) });
  })

  .post("/refunds/:id/paid", async (c) => {
    const { db, now } = c.get("deps");
    const r = await db.cautionRefund.findUnique({ where: { id: c.req.param("id") } });
    if (!r) throw ApiError.notFound("Refund");
    const at = now();
    const updated = await db.$transaction(async (tx) => {
      assertTransition(
        (await tx.cautionRefund.updateMany({ where: { id: r.id, status: "approved" }, data: { status: "paid", paidAt: at, payoutReference: codes.refundReference() } })).count,
        "Only approved refunds can be marked paid.",
      );
      await notify(tx, at, [
        [r.tenantId, { title: "Caution refund paid 💸", body: `${formatNaira(r.amount - (r.deductionAmount ?? 0))} has been sent to your account.`, kind: "payment", href: "/tenant/home" }],
      ]);
      return tx.cautionRefund.findUniqueOrThrow({ where: { id: r.id } });
    });
    return c.json({ refund: toRefund(updated) });
  })

  // ─── Rent installments ───

  .get("/rent-plans", async (c) => {
    const { db, storage } = c.get("deps");
    const { status } = query(c, z.object({ status: z.enum(["saving", "paid_out"]).optional() }));
    const rows = await db.rentPlan.findMany({
      where: { status },
      include: { ...rentPlanInclude, property: { include: propertyInclude }, tenant: { include: profileInclude }, lease: { include: leaseInclude } },
      orderBy: { createdAt: "desc" },
    });
    return c.json({
      items: await Promise.all(rows.map((r) => presentRentPlan(storage, toRentPlan(r)))),
      leases: uniqueById(rows.map((r) => toLease(r.lease))),
      properties: uniqueById(rows.map((r) => toProperty(r.property))),
      tenants: uniqueById(rows.map((r) => toUser(r.tenant))),
    });
  })

  .post("/rent-plans/:id/contributions/:cid/verify", async (c) => {
    const { db, storage, now } = c.get("deps");
    const planId = c.req.param("id");
    const at = now();
    const receiptNumber = await uniqueCode(codes.rentReceiptNumber, async (n) => !!(await db.rentContribution.findUnique({ where: { receiptNumber: n }, select: { id: true } })));
    await db.$transaction(async (tx) => {
      const contribution = await tx.rentContribution.findFirst({ where: { id: c.req.param("cid"), planId } });
      if (!contribution) throw ApiError.notFound("Installment");
      assertTransition(
        (await tx.rentContribution.updateMany({ where: { id: contribution.id, status: "submitted" }, data: { status: "verified", verifiedAt: at, receiptNumber } })).count,
        "This installment isn't waiting for verification.",
      );
      const { row, plan } = await loadRentPlan(tx, planId);
      const { row: leaseRow, lease } = await loadLease(tx, row.leaseId);
      const progress = rentPlanProgress(plan, lease, at.getTime());
      const items: [string, NewNotification][] = [
        [
          row.tenantId,
          progress.funded
            ? { title: "Rent fully paid 🎉", body: `You've paid all ${formatNaira(progress.target)}. renton will now pay your landlord.`, kind: "payment", href: "/tenant/payments" }
            : {
                title: "Installment confirmed",
                body: `${formatNaira(contribution.amount)} received. ${formatNaira(progress.remaining)} left to pay by ${formatDate(plan.dueDate)}.`,
                kind: "payment",
                href: "/tenant/payments",
              },
        ],
      ];
      if (progress.funded) {
        items.push([
          ADMINS,
          { title: "Rent fully paid: pay the landlord", body: `${leaseRow.tenant.name} has paid ${formatNaira(progress.target)} for ${leaseRow.property.title}.`, kind: "payment", href: "/admin/rent" },
        ]);
      }
      await notify(tx, at, items);
    });
    return c.json({ rentPlan: await presentRentPlan(storage, (await loadRentPlan(db, planId)).plan) });
  })

  .post("/rent-plans/:id/contributions/:cid/reject", async (c) => {
    const { db, storage, now } = c.get("deps");
    const { reason } = await body(c, reasonSchema);
    const planId = c.req.param("id");
    const at = now();
    await db.$transaction(async (tx) => {
      const contribution = await tx.rentContribution.findFirst({ where: { id: c.req.param("cid"), planId }, include: { plan: true } });
      if (!contribution) throw ApiError.notFound("Installment");
      assertTransition(
        (await tx.rentContribution.updateMany({ where: { id: contribution.id, status: "submitted" }, data: { status: "rejected", rejectionReason: reason } })).count,
        "This installment isn't waiting for verification.",
      );
      await notify(tx, at, [
        [contribution.plan.tenantId, { title: "We couldn't verify your installment", body: `${formatNaira(contribution.amount)}: ${reason}`, kind: "payment", href: "/tenant/payments" }],
      ]);
    });
    return c.json({ rentPlan: await presentRentPlan(storage, (await loadRentPlan(db, planId)).plan) });
  })

  /** Landlords are paid only once verified installments cover the full rent; the amount is frozen at payout. */
  .post("/rent-plans/:id/payout", async (c) => {
    const { db, storage, now } = c.get("deps");
    const admin = c.get("user");
    const planId = c.req.param("id");
    const at = now();
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM rent_plans WHERE id = ${planId} FOR UPDATE`;
      const { row, plan } = await loadRentPlan(tx, planId);
      if (plan.status !== "saving") throw ApiError.conflict("This plan has already been paid out.", "already_paid_out");
      const { row: leaseRow, lease } = await loadLease(tx, row.leaseId);
      const progress = rentPlanProgress(plan, lease, at.getTime());
      if (!progress.funded) {
        throw ApiError.rule("not_funded", `Only ${formatNaira(progress.saved)} of ${formatNaira(progress.target)} has been verified.`, { saved: progress.saved, target: progress.target });
      }
      const reference = codes.payoutReference();
      await tx.rentPlan.update({ where: { id: row.id }, data: { status: "paid_out", payoutAmount: progress.target, payoutReference: reference, payoutAt: at, payoutById: admin.id } });
      await tx.lease.update({ where: { id: row.leaseId }, data: { lastPaymentAt: at } });
      await notify(tx, at, [
        [
          row.landlordId,
          {
            title: "Rent paid to you 💸",
            body: `${formatNaira(progress.target)} from ${leaseRow.tenant.name} for ${leaseRow.property.title} (term from ${formatDate(plan.dueDate)}). Ref ${reference}.`,
            kind: "payment",
            href: "/landlord/tenants",
          },
        ],
        [row.tenantId, { title: "Your landlord has been paid", body: `renton sent your ${formatNaira(progress.target)} rent to your landlord. Ref ${reference}.`, kind: "payment", href: "/tenant/payments" }],
      ]);
    });
    return c.json({ rentPlan: await presentRentPlan(storage, (await loadRentPlan(db, planId)).plan) });
  });

/** Documents context: everything the tenancy agreement and receipt PDFs need, for the invoice's tenant, landlord or an admin. */
export const invoices = new Hono<AppEnv>().use(requireUser()).get("/:id", async (c) => {
  const { db, storage } = c.get("deps");
  const user = c.get("user");
  const inv = await db.paymentInvoice.findUnique({
    where: { id: c.req.param("id") },
    include: { ...invoiceInclude, property: { include: propertyInclude }, tenant: { include: profileInclude }, landlord: { include: profileInclude }, lease: { include: leaseInclude } },
  });
  if (!inv || (user.role !== "admin" && user.id !== inv.tenantId && user.id !== inv.landlordId)) throw ApiError.notFound("Invoice");
  const invoice = toInvoice(inv);
  return c.json({
    invoice: user.id === inv.landlordId ? { ...invoice, receipt: undefined } : await presentInvoice(storage, invoice),
    lease: inv.lease ? toLease(inv.lease) : null,
    property: toProperty(inv.property),
    tenant: toUser(inv.tenant),
    landlord: toUser(inv.landlord),
  });
});
