/**
 * Money and tenancy workflows, ported from apps/web/scripts/verify-workflows.ts and run against the API.
 * The steps share state in order, like the original script.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PROPERTIES } from "renton-core/mock/properties";
import { seed } from "../prisma/seed.js";
import { ADMIN, client, DAY, inbox, LANDLORD, makeApp, prisma, TENANT, testNow } from "./helpers.js";

beforeAll(() => seed(prisma));
afterAll(() => prisma.$disconnect());

const api = client(makeApp());
const receipt = (amountPaid: number) => ({ name: "slip.png", kind: "image", url: "data:image/png;base64,AAA", amountPaid, paidOn: testNow().toISOString(), payerBank: "GTBank" });
const lekki = PROPERTIES.find((p) => p.id === "p-lek-001")!;

let newLeaseId: string;

describe("move-in payment: approve → invoice → receipt → verify → lease", () => {
  let invoiceId: string;

  it("approval raises an invoice for rent + caution + 10% agency", async () => {
    const res = await api.as(LANDLORD).post("/v1/landlord/applications/app-1001/decision", { status: "approved", note: "Welcome!" });
    invoiceId = res.body.application.invoiceId;
    const { invoices } = (await api.as(TENANT).get("/v1/tenant/tenancy")).body;
    const inv = invoices.find((i: any) => i.id === invoiceId);
    const rent = lekki.rent; // app-1001 is a 1-year lease
    expect(inv.items.map((i: any) => [i.key, i.amount])).toEqual([["rent", rent], ["caution", lekki.cautionDeposit], ["agency", rent * 0.1]]);
    expect(inv).toMatchObject({ status: "awaiting_payment", total: rent + lekki.cautionDeposit + rent * 0.1 });
  });

  it("receipt → admin notified → rejected with a reason → re-uploaded", async () => {
    const first = await api.as(TENANT).post(`/v1/tenant/invoices/${invoiceId}/receipt`, receipt(1000));
    expect(first.body.invoice.status).toBe("submitted");
    expect((await inbox(ADMIN))[0]?.title).toBe("Payment receipt to verify");
    expect((await api.as(TENANT).post(`/v1/tenant/invoices/${invoiceId}/receipt`, receipt(1000))).body.error.code).toBe("invalid_status");
    expect((await api.as("u-tenant-2").post(`/v1/tenant/invoices/${invoiceId}/receipt`, receipt(1000))).status).toBe(404);

    await api.as(ADMIN).post(`/v1/admin/invoices/${invoiceId}/reject`, { reason: "The amount paid is less than the total due." });
    expect((await inbox(TENANT))[0]?.body).toMatch(/less than the total due/);

    const again = await api.as(TENANT).post(`/v1/tenant/invoices/${invoiceId}/receipt`, receipt(9_999_999));
    expect(again.body.invoice).toMatchObject({ status: "submitted" });
    expect(again.body.invoice.rejectionReason).toBeUndefined();
  });

  it("verification starts the tenancy exactly once", async () => {
    const [a, b] = await Promise.all([api.as(ADMIN).post(`/v1/admin/invoices/${invoiceId}/verify`), api.as(ADMIN).post(`/v1/admin/invoices/${invoiceId}/verify`)]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const ok = a.status === 200 ? a : b;
    expect(ok.body.invoice).toMatchObject({ status: "verified", verifiedBy: "Ibrahim Lawal" });
    expect(ok.body.invoice.receiptNumber).toMatch(/^HD-RCT-\d{8}$/);
    expect(ok.body.invoice.agreementNumber).toMatch(/^HD-TA-2026-\d{6}$/);
    newLeaseId = ok.body.lease.id;
    expect(await prisma.lease.count({ where: { propertyId: lekki.id, tenantId: TENANT } })).toBe(1);

    const app = await prisma.application.findUniqueOrThrow({ where: { id: "app-1001" } });
    expect(ok.body.lease.leaseStart).toBe(app.moveInDate.toISOString());
    expect(new Date(ok.body.lease.leaseEnd).getUTCFullYear()).toBe(app.moveInDate.getUTCFullYear() + 1);
    expect((await prisma.property.findUniqueOrThrow({ where: { id: lekki.id } })).occupancy).toBe("occupied");
    expect((await prisma.application.findUniqueOrThrow({ where: { id: "app-1006" } })).status).toBe("rejected");
    expect((await inbox(TENANT))[0]?.href).toBe("/tenant/profile#documents");
  });

  it("gives tenant, landlord and admin the tenancy-documents context, hiding the receipt from the landlord", async () => {
    const tenant = await api.as(TENANT).get(`/v1/invoices/${invoiceId}`);
    expect(tenant.body).toMatchObject({ lease: { id: newLeaseId }, property: { id: lekki.id }, tenant: { id: TENANT }, landlord: { id: LANDLORD } });
    expect(tenant.body.invoice.receipt.url).toBeTruthy();
    expect((await api.as(LANDLORD).get(`/v1/invoices/${invoiceId}`)).body.invoice.receipt).toBeUndefined();
    expect((await api.as("u-tenant-2").get(`/v1/invoices/${invoiceId}`)).status).toBe(404);
  });
});

describe("caution refunds", () => {
  const bank = { bankName: "GTBank", accountNumber: "0123456789", accountName: "Babatunde Afolabi" };

  it("needs move-out notice, then waits 30 days before approval", async () => {
    expect((await api.as("u-tenant-2").post("/v1/tenant/leases/ls-1/refund", bank)).body.error.code).toBe("notice_required");
    await api.as("u-tenant-2").put("/v1/tenant/leases/ls-1/intent", { decision: "move_out", moveOutDate: new Date(testNow().getTime() + 60 * DAY).toISOString() });
    expect((await inbox(LANDLORD))[0]?.title).toBe("Tenant moving out");

    const res = await api.as("u-tenant-2").post("/v1/tenant/leases/ls-1/refund", bank);
    expect(res.status).toBe(201);
    const waitDays = Math.round((Date.parse(res.body.refund.eligibleFrom) - testNow().getTime()) / DAY);
    expect(waitDays).toBeGreaterThanOrEqual(29);
    expect(waitDays).toBeLessThanOrEqual(30);
    expect((await api.as("u-tenant-2").post("/v1/tenant/leases/ls-1/refund", bank)).body.error.code).toBe("refund_exists");
    expect((await api.as("u-tenant-2").delete("/v1/tenant/leases/ls-1/intent")).body.error.code).toBe("refund_requested");

    const blocked = await api.as(ADMIN).post(`/v1/admin/refunds/${res.body.refund.id}/approve`, {});
    expect(blocked.status).toBe(422);
    expect(blocked.body.error.code).toBe("refund_not_eligible");
    expect((await api.as("u-tenant-2").post("/v1/tenant/leases/ls-1/refund", { ...bank, accountNumber: "123" })).status).toBe(400);
  });

  it("approves an eligible refund with a deduction and pays it once", async () => {
    const approved = await api.as(ADMIN).post("/v1/admin/refunds/rf-301/approve", { deduction: { amount: 100_000, reason: "Broken wardrobe door" } });
    expect(approved.body.refund).toMatchObject({ status: "approved", deduction: { amount: 100_000 } });
    const paid = await api.as(ADMIN).post("/v1/admin/refunds/rf-301/paid");
    expect(paid.body.refund.status).toBe("paid");
    expect(paid.body.refund.payoutReference).toMatch(/^HD-RFD-/);
    expect((await api.as(ADMIN).post("/v1/admin/refunds/rf-301/paid")).status).toBe(409);
    expect((await inbox("u-tenant-4"))[0]?.title).toBe("Caution refund paid 💸");
  });
});

describe("rent review", () => {
  it("serves notices: < 3 months skipped, current tenants negotiate, not-moved-in tenants get a fixed rent", async () => {
    const res = await api.as(LANDLORD).post("/v1/landlord/rent-increases", {
      targets: [
        { leaseId: "ls-2", newRent: 10_000_000 },
        { leaseId: "ls-4", newRent: 4_600_000 },
        { leaseId: newLeaseId, newRent: 10_500_000 },
        { leaseId: "ls-does-not-exist", newRent: 1 },
      ],
      note: "Market review",
    });
    expect(res.body.served.sort()).toEqual(["ls-4", newLeaseId].sort());
    expect(res.body.skipped.find((s: any) => s.leaseId === "ls-2").reason).toMatch(/3 months/);
    expect(res.body.skipped.find((s: any) => s.leaseId === "ls-does-not-exist").reason).toBe("Not one of your tenancies");

    const { leases } = (await api.as(LANDLORD).get("/v1/landlord/tenancy")).body;
    expect(leases.find((l: any) => l.id === newLeaseId).rentReview).toMatchObject({ negotiable: false, status: "agreed", agreedRent: 10_500_000 });
    expect(leases.find((l: any) => l.id === "ls-4").rentReview).toMatchObject({ negotiable: true, status: "proposed" });
    expect((await api.as(TENANT).post(`/v1/tenant/leases/${newLeaseId}/rent-review/respond`, { counter: 9_000_000 })).body.error.code).toBe("no_open_offer");
  });

  it("negotiates: counter → revised offer → accepted; renewal applies the agreed rent", async () => {
    const counter = await api.as(TENANT).post("/v1/tenant/leases/ls-5/rent-review/respond", { counter: 8_800_000, note: "Long-term tenant" });
    expect(counter.body.lease.rentReview.status).toBe("countered");
    expect((await inbox(LANDLORD))[0]?.title).toBe("Tenant made a counter-offer");
    expect((await api.as("u-landlord-2").post("/v1/landlord/leases/ls-5/rent-review/respond", { acceptCounter: true })).status).toBe(404);

    await api.as(LANDLORD).post("/v1/landlord/leases/ls-5/rent-review/respond", { counter: 9_000_000, note: "Meet in the middle?" });
    const accepted = await api.as(TENANT).post("/v1/tenant/leases/ls-5/rent-review/respond", { accept: true });
    expect(accepted.body.lease.rentReview).toMatchObject({ status: "agreed", agreedRent: 9_000_000 });
    expect(accepted.body.lease.rentReview.offers).toHaveLength(3);

    const before = new Date(accepted.body.lease.leaseEnd).getUTCFullYear();
    await api.as(TENANT).put("/v1/tenant/leases/ls-5/intent", { decision: "renew", renewYears: 1 });
    expect((await inbox(LANDLORD))[0]?.title).toBe("Tenant wants to renew");
    const renewed = await api.as(LANDLORD).post("/v1/landlord/leases/ls-5/intent/respond");
    expect(renewed.body.lease).toMatchObject({ annualRent: 9_000_000, status: "active", intent: { landlordResponse: { status: "accepted" } } });
    expect(new Date(renewed.body.lease.leaseEnd).getUTCFullYear()).toBe(before + 1);
    expect((await api.as(LANDLORD).post("/v1/landlord/leases/ls-5/intent/respond")).body.error.code).toBe("already_responded");
    expect((await api.as(TENANT).put("/v1/tenant/leases/ls-5/intent", { decision: "move_out" })).body.error.code).toBe("intent_locked");
  });

  it("re-prices an approved-but-unpaid tenant's invoice at the full new rent", async () => {
    await api.as(LANDLORD).post("/v1/landlord/applications/app-1005/decision", { status: "approved" });
    const app = await prisma.application.findUniqueOrThrow({ where: { id: "app-1005" }, include: { invoice: true } });
    const caution = PROPERTIES.find((p) => p.id === "p-gra-014")!.cautionDeposit;
    const res = await api.as(LANDLORD).post("/v1/landlord/properties/p-gra-014/rent", { rent: 9_000_000 });
    expect(res.body.updatedInvoices).toBe(1); // inv-2002 already has a receipt under review, so it keeps its price
    const inv = await prisma.paymentInvoice.findUniqueOrThrow({ where: { id: app.invoice!.id } });
    expect(inv.total).toBe(9_000_000 * app.leaseYears + caution + 900_000 * app.leaseYears);
    expect((await prisma.property.findUniqueOrThrow({ where: { id: "p-gra-014" } })).rent).toBe(9_000_000);
    expect((await api.as("u-landlord-2").post("/v1/landlord/properties/p-gra-014/rent", { rent: 1 })).status).toBe(404);
  });
});

describe("rent installments", () => {
  it("pays out a funded plan once and blocks an unfunded one", async () => {
    expect((await api.as(ADMIN).post("/v1/admin/rent-plans/rp-1/payout")).body.error.code).toBe("not_funded");
    const [a, b] = await Promise.all([api.as(ADMIN).post("/v1/admin/rent-plans/rp-2/payout"), api.as(ADMIN).post("/v1/admin/rent-plans/rp-2/payout")]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const ok = a.status === 200 ? a : b;
    expect(ok.body.rentPlan).toMatchObject({ status: "paid_out", payout: { amount: 14_000_000, by: "Ibrahim Lawal" } });
    expect((await inbox(LANDLORD))[0]?.title).toBe("Rent paid to you 💸");
  });

  it("enforces the minimum, the balance cap and pending money; rejected receipts don't count", async () => {
    const start = await api.as(TENANT).post(`/v1/tenant/leases/${newLeaseId}/rent-plan`, { schedule: "flexible" });
    expect(start.status).toBe(201);
    const planId = start.body.rentPlan.id;
    expect(start.body.rentPlan.reference).toMatch(/^HD-RENT/);
    expect((await api.as(TENANT).post(`/v1/tenant/leases/${newLeaseId}/rent-plan`, { schedule: "monthly" })).body.error.code).toBe("plan_exists");

    const target = 10_500_000; // the fixed rent served above for this lease's next term
    const pay = (amount: number) => api.as(TENANT).post(`/v1/tenant/rent-plans/${planId}/contributions`, receipt(amount));
    const last = async () => (await prisma.rentContribution.findFirstOrThrow({ where: { planId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] })).id;
    const saved = async () => (await prisma.rentContribution.aggregate({ where: { planId, status: "verified" }, _sum: { amount: true } }))._sum.amount ?? 0;

    expect((await pay(1_000)).body.error.code).toBe("below_minimum");
    expect((await pay(target + 1)).body.error.code).toBe("over_balance");
    expect((await pay(700_000)).status).toBe(201);
    expect((await inbox(ADMIN))[0]?.title).toBe("Rent installment to verify");
    await api.as(ADMIN).post(`/v1/admin/rent-plans/${planId}/contributions/${await last()}/reject`, { reason: "Not found on statement" });
    expect(await saved()).toBe(0);

    await pay(1_250_000);
    await api.as(ADMIN).post(`/v1/admin/rent-plans/${planId}/contributions/${await last()}/verify`);
    expect(await saved()).toBe(1_250_000);
    expect((await inbox(TENANT))[0]?.title).toBe("Installment confirmed");

    expect((await pay(target - 1_250_000 - 1_000)).status).toBe(201);
    const capped = await pay(2_000);
    expect(capped.body.error).toMatchObject({ code: "over_balance", details: { maxNext: 1_000 } });
    expect((await pay(1_000)).status).toBe(201); // the final installment may be below the minimum
    expect((await pay(1_000)).body.error.code).toBe("fully_covered");

    for (const c of await prisma.rentContribution.findMany({ where: { planId, status: "submitted" } })) {
      await api.as(ADMIN).post(`/v1/admin/rent-plans/${planId}/contributions/${c.id}/verify`);
    }
    expect(await saved()).toBe(target);
    expect((await inbox(ADMIN))[0]?.title).toBe("Rent fully paid: pay the landlord");
    expect((await api.as(ADMIN).post(`/v1/admin/rent-plans/${planId}/payout`)).body.rentPlan.payout.amount).toBe(target);
    expect((await api.as(TENANT).post(`/v1/tenant/leases/${newLeaseId}/rent-plan`, { schedule: "monthly" })).body.error.code).toBe("plan_exists");
  });

  it("stops tenants who gave move-out notice from saving", async () => {
    expect((await api.as("u-tenant-3").post("/v1/tenant/leases/ls-2/rent-plan", { schedule: "monthly" })).body.error.code).toBe("moving_out");
  });
});

describe("move-out", () => {
  it("acknowledging a move-out lists the home as available soon", async () => {
    const moveOut = new Date(testNow().getTime() + 20 * DAY).toISOString().slice(0, 10);
    await api.as("u-tenant-6").put("/v1/tenant/leases/ls-4/intent", { decision: "move_out", moveOutDate: moveOut, reason: "Relocating" });
    await api.as(LANDLORD).post("/v1/landlord/leases/ls-4/intent/respond");
    const prop = await prisma.property.findUniqueOrThrow({ where: { id: "p-ogr-017" } });
    expect(prop.occupancy).toBe("available_soon");
    expect(prop.availableFrom.toISOString().slice(0, 10)).toBe(moveOut);
    expect((await inbox("u-tenant-6"))[0]?.title).toBe("Move-out acknowledged");
  });

  it("lists admin queues with related records", async () => {
    const invoices = await api.as(ADMIN).get("/v1/admin/invoices?status=submitted");
    expect(invoices.body.items.every((i: any) => i.status === "submitted")).toBe(true);
    const refunds = await api.as(ADMIN).get("/v1/admin/refunds");
    expect(refunds.body.leases.length).toBeGreaterThan(0);
    const plans = await api.as(ADMIN).get("/v1/admin/rent-plans?status=paid_out");
    expect(plans.body.items.length).toBe(2);
    expect((await api.as(TENANT).get("/v1/admin/invoices")).status).toBe(403);
    // Landlords don't see tenants' bank details or receipt files.
    const mine = (await api.as(LANDLORD).get("/v1/landlord/tenancy")).body;
    expect(mine.refunds.every((r: any) => r.bank === undefined)).toBe(true);
    expect(mine.invoices.every((i: any) => i.receipt === undefined)).toBe(true);
  });
});
