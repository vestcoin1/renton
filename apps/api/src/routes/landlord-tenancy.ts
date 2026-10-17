import { Hono } from "hono";
import { moveInFees } from "renton-core/fees";
import { canServeRentNotice, hasMovedIn, nextTermRent } from "renton-core/tenancy-rules";
import { formatDate, formatNaira } from "renton-core/utils";
import { z } from "zod";
import { requireUser } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";
import { ApiError } from "../lib/errors.js";
import { body, naira } from "../lib/validate.js";
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
import { notifyWaitingListMatches } from "../services/matching.js";
import { notify, type NewNotification } from "../services/notifications.js";
import { addYears, assertTransition, loadLease } from "../services/tenancy.js";
import { uniqueById } from "./applications.js";

const rentResponseSchema = z.union([
  z.object({ acceptCounter: z.literal(true) }),
  z.object({ counter: naira.min(1), note: z.string().trim().max(1000).optional() }),
  z.object({ withdraw: z.literal(true) }),
]);

async function ownLease(db: AppEnv["Variables"]["deps"]["db"], landlordId: string, leaseId: string) {
  const loaded = await loadLease(db, leaseId);
  if (loaded.row.property.landlordId !== landlordId) throw ApiError.notFound("Lease");
  return loaded;
}

export const landlordTenancy = new Hono<AppEnv>()
  .use(requireUser("landlord"))

  /** Tenants, leases and money for the landlord's homes (as useLandlordData). Receipts stay with renton. */
  .get("/tenancy", async (c) => {
    const { db } = c.get("deps");
    const mine = { property: { landlordId: c.get("user").id } };
    const [leases, invoices, refunds, plans, properties] = await Promise.all([
      db.lease.findMany({ where: mine, include: { ...leaseInclude, tenant: { include: profileInclude } }, orderBy: { leaseEnd: "asc" } }),
      db.paymentInvoice.findMany({ where: mine, include: invoiceInclude, orderBy: { createdAt: "desc" } }),
      db.cautionRefund.findMany({ where: mine, orderBy: { requestedAt: "desc" } }),
      db.rentPlan.findMany({ where: mine, include: rentPlanInclude, orderBy: { createdAt: "desc" } }),
      db.property.findMany({ where: { landlordId: c.get("user").id }, include: propertyInclude }),
    ]);
    const hideReceipt = <T extends { receipt?: unknown }>(x: T) => ({ ...x, receipt: undefined });
    return c.json({
      leases: leases.map(toLease),
      tenants: uniqueById(leases.map((l) => toUser(l.tenant))),
      invoices: invoices.map((i) => hideReceipt(toInvoice(i))),
      refunds: refunds.map((r) => ({ ...toRefund(r), bank: undefined })),
      rentPlans: plans.map(toRentPlan).map((p) => ({ ...p, contributions: p.contributions.map((x) => ({ ...x, receipt: { ...x.receipt, url: "" } })) })),
      properties: properties.map(toProperty),
    });
  })

  /**
   * Serve a rent increase on one or more leases. Current tenants need ≥ 3 months' notice and can negotiate;
   * tenants who haven't moved in get the new rent fixed for the next term. Skipped leases come back with a reason.
   */
  .post("/rent-increases", async (c) => {
    const { db, now } = c.get("deps");
    const landlordId = c.get("user").id;
    const input = await body(c, z.object({ targets: z.array(z.object({ leaseId: z.string(), newRent: naira.min(1) })).min(1).max(100), note: z.string().trim().max(1000).optional() }));
    const at = now();
    const served: string[] = [];
    const skipped: { leaseId: string; reason: string }[] = [];

    await db.$transaction(async (tx) => {
      for (const t of input.targets) {
        const row = await tx.lease.findUnique({ where: { id: t.leaseId }, include: { ...leaseInclude, property: true } });
        if (!row || row.property.landlordId !== landlordId) {
          skipped.push({ leaseId: t.leaseId, reason: "Not one of your tenancies" });
          continue;
        }
        const lease = toLease(row);
        const movedIn = hasMovedIn(lease, at.getTime());
        const notice = canServeRentNotice(lease, at.getTime());
        if (movedIn && !notice.ok) {
          skipped.push({ leaseId: t.leaseId, reason: notice.reason });
          continue;
        }
        await tx.rentReview.create({
          data: {
            leaseId: row.id,
            currentRent: row.annualRent,
            proposedRent: t.newRent,
            effectiveFrom: row.leaseEnd,
            noticeServedAt: at,
            negotiable: movedIn,
            status: movedIn ? "proposed" : "agreed",
            createdAt: at,
            ...(movedIn ? {} : { agreedRent: t.newRent, agreedAt: at }),
            offers: { create: { by: "landlord", amount: t.newRent, note: input.note ?? null, at } },
          },
        });
        const end = formatDate(row.leaseEnd.toISOString());
        await notify(tx, at, [
          [
            row.tenantId,
            movedIn
              ? { title: "Rent review notice", body: `Your landlord proposes ${formatNaira(t.newRent)}/yr from ${end}. You can accept or make a counter-offer.`, kind: "lease", href: "/tenant/home" }
              : { title: "New rent for your next term", body: `Rent from ${end} will be ${formatNaira(t.newRent)}/yr.`, kind: "lease", href: "/tenant/home" },
          ],
        ]);
        served.push(row.id);
      }
    });
    return c.json({ served, skipped });
  })

  /** New rent for a home: re-prices unpaid move-in invoices (approved tenants who haven't paid can't negotiate). */
  .post("/properties/:id/rent", async (c) => {
    const { db, now } = c.get("deps");
    const { rent } = await body(c, z.object({ rent: naira.min(1) }));
    const property = await db.property.findUnique({ where: { id: c.req.param("id") } });
    if (!property || property.landlordId !== c.get("user").id) throw ApiError.notFound("Property");
    const at = now();
    const updatedInvoices = await db.$transaction(async (tx) => {
      await tx.property.update({ where: { id: property.id }, data: { rent } });
      const affected = await tx.paymentInvoice.findMany({ where: { propertyId: property.id, status: { in: ["awaiting_payment", "rejected"] } }, include: { application: true } });
      for (const inv of affected) {
        const { items, total } = moveInFees({ rent, cautionDeposit: property.cautionDeposit }, inv.application?.leaseYears ?? 1);
        await tx.invoiceItem.deleteMany({ where: { invoiceId: inv.id } });
        await tx.paymentInvoice.update({ where: { id: inv.id }, data: { total, items: { create: items.map((i) => ({ key: i.key, label: i.label, amount: i.amount })) } } });
        await notify(tx, at, [
          [
            inv.tenantId,
            {
              title: "Rent updated for your new home",
              body: `The landlord set the rent for ${property.title} to ${formatNaira(rent)}/yr. Your move-in total is now ${formatNaira(total)}.`,
              kind: "payment",
              href: "/tenant/payments",
            },
          ],
        ]);
      }
      return affected.length;
    });
    return c.json({ updatedInvoices });
  })

  .post("/leases/:id/rent-review/respond", async (c) => {
    const { db, now } = c.get("deps");
    const response = await body(c, rentResponseSchema);
    const { row } = await ownLease(db, c.get("user").id, c.req.param("id"));
    const review = row.rentReviews[0];
    if (!review || review.status === "agreed" || review.status === "withdrawn") throw ApiError.conflict("There's no open rent review on this lease.", "no_open_review");
    const latest = review.offers[review.offers.length - 1]!.amount;
    const effective = formatDate(review.effectiveFrom.toISOString());
    const at = now();
    let note: NewNotification;
    await db.$transaction(async (tx) => {
      if ("withdraw" in response) {
        assertTransition((await tx.rentReview.updateMany({ where: { id: review.id, status: review.status }, data: { status: "withdrawn" } })).count);
        note = { title: "Rent increase withdrawn", body: `Your rent stays at ${formatNaira(review.currentRent)}/yr.`, kind: "lease", href: "/tenant/home" };
      } else if ("acceptCounter" in response) {
        if (review.status !== "countered") throw ApiError.conflict("The tenant hasn't made a counter-offer.", "no_counter");
        assertTransition((await tx.rentReview.updateMany({ where: { id: review.id, status: "countered" }, data: { status: "agreed", agreedRent: latest, agreedAt: at } })).count);
        note = { title: "Landlord accepted your offer 🎉", body: `Your new rent is ${formatNaira(latest)}/yr from ${effective}.`, kind: "lease", href: "/tenant/home" };
      } else {
        assertTransition((await tx.rentReview.updateMany({ where: { id: review.id, status: review.status }, data: { status: "proposed" } })).count);
        await tx.rentOffer.create({ data: { reviewId: review.id, by: "landlord", amount: response.counter, note: response.note ?? null, at } });
        note = { title: "New rent offer from your landlord", body: `${formatNaira(response.counter)}/yr from ${effective}.`, kind: "lease", href: "/tenant/home" };
      }
      await notify(tx, at, [[row.tenantId, note]]);
    });
    return c.json({ lease: (await loadLease(db, row.id)).lease });
  })

  /**
   * Accept a renewal (extends the lease, applying any agreed rent) or acknowledge a move-out
   * (lists the home as available soon and tells matching waiting-list tenants).
   */
  .post("/leases/:id/intent/respond", async (c) => {
    const { db, now } = c.get("deps");
    const { row, lease } = await ownLease(db, c.get("user").id, c.req.param("id"));
    const intent = row.intent;
    if (!intent) throw ApiError.conflict("The tenant hasn't told you their plans yet.", "no_intent");
    if (intent.landlordResponse) throw ApiError.conflict("You've already responded.", "already_responded");
    const renew = intent.decision === "renew";
    const at = now();
    const newEnd = renew ? addYears(row.leaseEnd, intent.renewYears ?? 1) : row.leaseEnd;

    await db.$transaction(async (tx) => {
      assertTransition(
        (await tx.leaseIntent.updateMany({ where: { leaseId: row.id, landlordResponse: null }, data: { landlordResponse: renew ? "accepted" : "acknowledged", landlordRespondedAt: at } })).count,
      );
      if (renew) {
        await tx.lease.update({ where: { id: row.id }, data: { leaseEnd: newEnd, status: "active", annualRent: nextTermRent(lease) } });
      } else {
        const property = await tx.property.update({
          where: { id: row.propertyId },
          data: { occupancy: "available_soon", availableFrom: intent.moveOutDate ?? row.leaseEnd },
          include: propertyInclude,
        });
        if (property.verification === "published" || property.verification === "verified") await notifyWaitingListMatches(tx, at, toProperty(property));
      }
      await notify(tx, at, [
        [
          row.tenantId,
          renew
            ? { title: "Renewal accepted 🎉", body: `Your lease now runs until ${formatDate(newEnd.toISOString())}.`, kind: "lease", href: "/tenant/home" }
            : { title: "Move-out acknowledged", body: "Your landlord confirmed your move-out. We'll schedule a check-out inspection.", kind: "lease", href: "/tenant/home" },
        ],
      ]);
    });
    return c.json({ lease: (await loadLease(db, row.id)).lease });
  });
