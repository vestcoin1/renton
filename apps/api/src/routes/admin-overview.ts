import { Hono } from "hono";
import { requireUser } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";

const tally = <K extends string>(rows: { key: K; n: number }[]) => Object.fromEntries(rows.map((r) => [r.key, r.n])) as Partial<Record<K, number>>;

/** Live counts for the admin dashboard: what's waiting on the team right now. */
export const adminOverview = new Hono<AppEnv>().use(requireUser("admin")).get("/", async (c) => {
  const { db } = c.get("deps");
  const [users, stages, identityPending, invoices, refunds, plans, reports, repairs] = await Promise.all([
    db.profile.groupBy({ by: ["role"], _count: { _all: true } }),
    db.property.groupBy({ by: ["verification"], _count: { _all: true } }),
    db.identityVerification.count({ where: { status: "pending" } }),
    db.paymentInvoice.groupBy({ by: ["status"], _count: { _all: true } }),
    db.cautionRefund.groupBy({ by: ["status"], _count: { _all: true } }),
    db.rentContribution.count({ where: { status: "submitted" } }),
    db.report.groupBy({ by: ["status"], _count: { _all: true } }),
    db.maintenanceRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return c.json({
    usersByRole: tally(users.map((r) => ({ key: r.role, n: r._count._all }))),
    propertiesByStage: tally(stages.map((r) => ({ key: r.verification, n: r._count._all }))),
    invoicesByStatus: tally(invoices.map((r) => ({ key: r.status, n: r._count._all }))),
    refundsByStatus: tally(refunds.map((r) => ({ key: r.status, n: r._count._all }))),
    reportsByStatus: tally(reports.map((r) => ({ key: r.status, n: r._count._all }))),
    repairsByStatus: tally(repairs.map((r) => ({ key: r.status, n: r._count._all }))),
    waiting: { identityReviews: identityPending, installmentsToVerify: plans },
  });
});
