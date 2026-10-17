import { Hono } from "hono";
import { currentRentPlan, MIN_INSTALLMENT, refundEligibleFrom, rentPlanProgress } from "renton-core/tenancy-rules";
import { formatDate, formatNaira } from "renton-core/utils";
import { z } from "zod";
import { requireUser } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";
import { codes, uniqueCode } from "../lib/codes.js";
import { ApiError } from "../lib/errors.js";
import { assertOwnFile } from "../lib/storage.js";
import { body, isoDate, naira } from "../lib/validate.js";
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
import { ADMINS, notify } from "../services/notifications.js";
import { presentInvoice, presentRentPlan } from "../services/present.js";
import { assertTransition, loadLease, loadRentPlan } from "../services/tenancy.js";
import { uniqueById } from "./applications.js";

export const receiptSchema = z.object({
  name: z.string().trim().min(1).max(200),
  kind: z.enum(["image", "pdf"]),
  url: z.string().min(1),
  amountPaid: naira.min(1),
  paidOn: isoDate,
  payerBank: z.string().trim().min(2).max(80),
});

const intentSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("renew"), renewYears: z.number().int().min(1).max(3), note: z.string().trim().max(1000).optional() }),
  z.object({
    decision: z.literal("move_out"),
    moveOutDate: isoDate.optional(),
    reason: z.string().trim().max(500).optional(),
    note: z.string().trim().max(1000).optional(),
  }),
]);

const rentResponseSchema = z.union([z.object({ accept: z.literal(true) }), z.object({ counter: naira.min(1), note: z.string().trim().max(1000).optional() })]);

const bankSchema = z.object({
  bankName: z.string().trim().min(2).max(80),
  accountNumber: z.string().regex(/^\d{10}$/, "Account numbers have 10 digits (NUBAN)."),
  accountName: z.string().trim().min(2).max(120),
});

/** The tenant's own lease, or 404. */
async function ownLease(db: AppEnv["Variables"]["deps"]["db"], tenantId: string, leaseId: string) {
  const loaded = await loadLease(db, leaseId);
  if (loaded.row.tenantId !== tenantId) throw ApiError.notFound("Lease");
  return loaded;
}

export const tenantTenancy = new Hono<AppEnv>()
  .use(requireUser("tenant"))

  /** Everything the tenant's home, payments and profile pages need (as useTenantData). */
  .get("/tenancy", async (c) => {
    const { db, storage } = c.get("deps");
    const tenantId = c.get("user").id;
    const [leases, invoices, refunds, plans] = await Promise.all([
      db.lease.findMany({ where: { tenantId }, include: leaseInclude, orderBy: { leaseStart: "desc" } }),
      db.paymentInvoice.findMany({ where: { tenantId }, include: invoiceInclude, orderBy: { createdAt: "desc" } }),
      db.cautionRefund.findMany({ where: { tenantId }, orderBy: { requestedAt: "desc" } }),
      db.rentPlan.findMany({ where: { tenantId }, include: rentPlanInclude, orderBy: { createdAt: "desc" } }),
    ]);
    const propertyIds = [...new Set([...leases.map((l) => l.propertyId), ...invoices.map((i) => i.propertyId)])];
    const properties = await db.property.findMany({ where: { id: { in: propertyIds } }, include: { ...propertyInclude, landlord: { include: profileInclude } } });
    return c.json({
      leases: leases.map(toLease),
      invoices: await Promise.all(invoices.map((i) => presentInvoice(storage, toInvoice(i)))),
      refunds: refunds.map(toRefund),
      rentPlans: await Promise.all(plans.map((p) => presentRentPlan(storage, toRentPlan(p)))),
      properties: properties.map(toProperty),
      landlords: uniqueById(properties.map((p) => toUser(p.landlord))),
    });
  })

  /** Upload (or re-upload after a rejection) the transfer receipt for a move-in invoice. */
  .post("/invoices/:id/receipt", async (c) => {
    const { db, storage, now } = c.get("deps");
    const user = c.get("user");
    const receipt = await body(c, receiptSchema);
    assertOwnFile(storage, "receipt", user.id, receipt.url);
    const inv = await db.paymentInvoice.findUnique({ where: { id: c.req.param("id") }, include: { property: true } });
    if (!inv || inv.tenantId !== user.id) throw ApiError.notFound("Invoice");
    const at = now();
    const updated = await db.$transaction(async (tx) => {
      const r = await tx.paymentReceipt.create({
        data: { name: receipt.name, fileKind: receipt.kind, url: receipt.url, amountPaid: receipt.amountPaid, paidOn: new Date(receipt.paidOn), payerBank: receipt.payerBank, uploadedAt: at },
      });
      const { count } = await tx.paymentInvoice.updateMany({
        where: { id: inv.id, status: { in: ["awaiting_payment", "rejected"] } },
        data: { status: "submitted", receiptId: r.id, rejectionReason: null },
      });
      if (count === 0) throw ApiError.conflict("This invoice isn't waiting for a receipt.", "invalid_status");
      await notify(tx, at, [
        [
          ADMINS,
          {
            title: "Payment receipt to verify",
            body: `${user.name} paid ${formatNaira(receipt.amountPaid)} for ${inv.property.title} (ref ${inv.reference}).`,
            kind: "payment",
            href: "/admin/payments",
          },
        ],
      ]);
      return tx.paymentInvoice.findUniqueOrThrow({ where: { id: inv.id }, include: invoiceInclude });
    });
    return c.json({ invoice: await presentInvoice(storage, toInvoice(updated)) });
  })

  // ─── End of lease ───

  .put("/leases/:id/intent", async (c) => {
    const { db, now } = c.get("deps");
    const input = await body(c, intentSchema);
    const { row } = await ownLease(db, c.get("user").id, c.req.param("id"));
    if (row.status === "ended") throw ApiError.rule("lease_ended", "This tenancy has ended.");
    if (row.intent?.landlordResponse) throw ApiError.conflict("Your landlord has already responded to your decision.", "intent_locked");
    const at = now();
    const renew = input.decision === "renew";
    const moveOutDate = input.decision === "move_out" ? new Date(input.moveOutDate ?? row.leaseEnd) : null;
    const data = {
      decision: input.decision,
      renewYears: renew ? input.renewYears : null,
      moveOutDate,
      reason: input.decision === "move_out" ? (input.reason ?? null) : null,
      note: input.note ?? null,
      submittedAt: at,
      landlordResponse: null,
      landlordRespondedAt: null,
    };
    await db.$transaction(async (tx) => {
      await tx.leaseIntent.upsert({ where: { leaseId: row.id }, create: { leaseId: row.id, ...data }, update: data });
      await notify(tx, at, [
        [
          row.property.landlordId,
          {
            title: renew ? "Tenant wants to renew" : "Tenant moving out",
            body: renew
              ? `${row.tenant.name} wants to renew ${row.unit}, ${row.property.area} for ${input.renewYears} year${input.renewYears === 1 ? "" : "s"}.`
              : `${row.tenant.name} will move out of ${row.unit}, ${row.property.area} on ${formatDate(moveOutDate!.toISOString())}.`,
            kind: "lease",
            href: "/landlord/tenants",
          },
        ],
      ]);
    });
    return c.json({ lease: (await loadLease(db, row.id)).lease });
  })

  .delete("/leases/:id/intent", async (c) => {
    const { db } = c.get("deps");
    const { row } = await ownLease(db, c.get("user").id, c.req.param("id"));
    if (!row.intent) return c.json({ lease: toLease(row) });
    if (row.intent.landlordResponse) throw ApiError.conflict("Your landlord has already responded to your decision.", "intent_locked");
    if (await db.cautionRefund.findUnique({ where: { leaseId: row.id }, select: { id: true } })) {
      throw ApiError.conflict("You've requested your caution refund, so the move-out can't be withdrawn.", "refund_requested");
    }
    await db.leaseIntent.delete({ where: { leaseId: row.id } });
    return c.json({ lease: (await loadLease(db, row.id)).lease });
  })

  // ─── Rent review (tenant side) ───

  .post("/leases/:id/rent-review/respond", async (c) => {
    const { db, now } = c.get("deps");
    const response = await body(c, rentResponseSchema);
    const { row } = await ownLease(db, c.get("user").id, c.req.param("id"));
    const review = row.rentReviews[0];
    if (!review || !review.negotiable || review.status !== "proposed") {
      throw ApiError.conflict("There's no rent offer waiting for your answer.", "no_open_offer");
    }
    const latest = review.offers[review.offers.length - 1]!.amount;
    const at = now();
    await db.$transaction(async (tx) => {
      if ("accept" in response) {
        const { count } = await tx.rentReview.updateMany({ where: { id: review.id, status: "proposed" }, data: { status: "agreed", agreedRent: latest, agreedAt: at } });
        assertTransition(count);
      } else {
        const { count } = await tx.rentReview.updateMany({ where: { id: review.id, status: "proposed" }, data: { status: "countered" } });
        assertTransition(count);
        await tx.rentOffer.create({ data: { reviewId: review.id, by: "tenant", amount: response.counter, note: response.note ?? null, at } });
      }
      await notify(tx, at, [
        [
          row.property.landlordId,
          "accept" in response
            ? { title: "Rent increase accepted", body: `${row.tenant.name} agreed to ${formatNaira(latest)}/yr from ${formatDate(review.effectiveFrom.toISOString())}.`, kind: "lease", href: "/landlord/tenants" }
            : { title: "Tenant made a counter-offer", body: `${row.tenant.name} offered ${formatNaira(response.counter)}/yr for ${row.unit}.`, kind: "lease", href: "/landlord/tenants" },
        ],
      ]);
    });
    return c.json({ lease: (await loadLease(db, row.id)).lease });
  })

  // ─── Caution refund ───

  /** Only after move-out notice; payable REFUND_WAIT_DAYS after the notice (renton-core/tenancy-rules). */
  .post("/leases/:id/refund", async (c) => {
    const { db, now } = c.get("deps");
    const bank = await body(c, bankSchema);
    const { row, lease } = await ownLease(db, c.get("user").id, c.req.param("id"));
    if (lease.intent?.decision !== "move_out") throw ApiError.rule("notice_required", "Give notice that you're moving out before requesting your caution refund.");
    if (await db.cautionRefund.findUnique({ where: { leaseId: row.id }, select: { id: true } })) throw ApiError.conflict("You've already requested this refund.", "refund_exists");
    const paid = await db.invoiceItem.findFirst({ where: { key: "caution", invoice: { leaseId: row.id } }, select: { amount: true } });
    const at = now();
    const refund = await db.$transaction(async (tx) => {
      const created = await tx.cautionRefund.create({
        data: {
          leaseId: row.id,
          tenantId: row.tenantId,
          propertyId: row.propertyId,
          landlordId: row.property.landlordId,
          amount: paid?.amount ?? row.property.cautionDeposit,
          eligibleFrom: new Date(refundEligibleFrom(lease.intent!)),
          ...bank,
          status: "requested",
          requestedAt: at,
        },
      });
      const from = formatDate(created.eligibleFrom.toISOString());
      await notify(tx, at, [
        [ADMINS, { title: "Caution refund requested", body: `${formatNaira(created.amount)} · payable from ${from}.`, kind: "payment", href: "/admin/refunds" }],
        [
          row.property.landlordId,
          { title: "Tenant requested caution refund", body: `${row.unit}, ${row.property.area}. Report any damage to renton before ${from}.`, kind: "payment", href: "/landlord/tenants" },
        ],
      ]);
      return created;
    });
    return c.json({ refund: toRefund(refund) }, 201);
  })

  // ─── Rent installments ───

  .post("/leases/:id/rent-plan", async (c) => {
    const { db, now } = c.get("deps");
    const { schedule } = await body(c, z.object({ schedule: z.enum(["monthly", "flexible"]) }));
    const { row, lease } = await ownLease(db, c.get("user").id, c.req.param("id"));
    if (lease.status === "ended") throw ApiError.rule("lease_ended", "This tenancy has ended.");
    if (lease.intent?.decision === "move_out") throw ApiError.rule("moving_out", "You've given notice to move out, so you can't save towards another term.");
    const plans = (await db.rentPlan.findMany({ where: { leaseId: row.id }, include: rentPlanInclude })).map(toRentPlan);
    if (currentRentPlan(plans, lease)) throw ApiError.conflict("You already have a rent plan for this term.", "plan_exists");
    const reference = await uniqueCode(codes.rentPlanReference, async (r) => !!(await db.rentPlan.findUnique({ where: { reference: r }, select: { id: true } })));
    const plan = await db.rentPlan.create({
      data: { leaseId: row.id, tenantId: row.tenantId, propertyId: row.propertyId, landlordId: row.property.landlordId, reference, dueDate: row.leaseEnd, schedule, createdAt: now() },
      include: rentPlanInclude,
    });
    return c.json({ rentPlan: toRentPlan(plan) }, 201);
  })

  .patch("/rent-plans/:id", async (c) => {
    const { db } = c.get("deps");
    const { schedule } = await body(c, z.object({ schedule: z.enum(["monthly", "flexible"]) }));
    const { count } = await db.rentPlan.updateMany({ where: { id: c.req.param("id"), tenantId: c.get("user").id, status: "saving" }, data: { schedule } });
    if (count === 0) throw ApiError.notFound("Rent plan");
    return c.json({ rentPlan: (await loadRentPlan(db, c.req.param("id"))).plan });
  })

  /** One installment. Pending receipts count against the balance so the tenant can't overpay. */
  .post("/rent-plans/:id/contributions", async (c) => {
    const { db, storage, now } = c.get("deps");
    const user = c.get("user");
    const receipt = await body(c, receiptSchema);
    assertOwnFile(storage, "receipt", user.id, receipt.url);
    const planId = c.req.param("id");
    const amount = Math.round(receipt.amountPaid);
    const at = now();
    await db.$transaction(async (tx) => {
      // Lock the plan so two installments submitted at once can't both fit under the balance.
      await tx.$queryRaw`SELECT id FROM rent_plans WHERE id = ${planId} FOR UPDATE`;
      const { row, plan } = await loadRentPlan(tx, planId);
      if (row.tenantId !== user.id) throw ApiError.notFound("Rent plan");
      const { row: leaseRow, lease } = await loadLease(tx, row.leaseId);
      if (plan.status !== "saving") throw ApiError.rule("plan_closed", "This rent plan is closed.");
      if (lease.intent?.decision === "move_out") throw ApiError.rule("moving_out", "You've given notice to move out, so you can't save towards another term.");
      const { maxNext } = rentPlanProgress(plan, lease, at.getTime());
      if (maxNext <= 0) throw ApiError.rule("fully_covered", "Your rent is fully covered by payments already made or being verified.");
      if (amount > maxNext) throw ApiError.rule("over_balance", `That's more than the ${formatNaira(maxNext)} left to pay.`, { maxNext });
      // The last installment may be smaller than the minimum so the tenant can finish off the balance.
      if (amount < Math.min(MIN_INSTALLMENT, maxNext)) throw ApiError.rule("below_minimum", `The minimum installment is ${formatNaira(MIN_INSTALLMENT)}.`, { minimum: MIN_INSTALLMENT });

      const r = await tx.paymentReceipt.create({
        data: { name: receipt.name, fileKind: receipt.kind, url: receipt.url, amountPaid: amount, paidOn: new Date(receipt.paidOn), payerBank: receipt.payerBank, uploadedAt: at },
      });
      await tx.rentContribution.create({ data: { planId: row.id, amount, receiptId: r.id, status: "submitted", createdAt: at } });
      await notify(tx, at, [
        [
          ADMINS,
          {
            title: "Rent installment to verify",
            body: `${user.name} paid ${formatNaira(amount)} towards rent for ${leaseRow.property.title} (ref ${row.reference}).`,
            kind: "payment",
            href: "/admin/rent",
          },
        ],
      ]);
    });
    return c.json({ rentPlan: await presentRentPlan(storage, (await loadRentPlan(db, planId)).plan) }, 201);
  });
