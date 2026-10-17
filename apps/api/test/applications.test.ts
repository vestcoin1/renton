import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { moveInFees } from "renton-core/fees";
import { APPLICATIONS } from "renton-core/mock/records";
import { PROPERTIES, isPublic } from "renton-core/mock/properties";
import { seed } from "../prisma/seed.js";
import { client, inbox, LANDLORD, makeApp, prisma, TENANT } from "./helpers.js";

beforeAll(() => seed(prisma));
afterAll(() => prisma.$disconnect());

const api = client(makeApp());

/** A live, vacant home of the demo landlord that the demo tenant hasn't applied for. */
const freshHome = PROPERTIES.find(
  (p) => isPublic(p) && p.occupancy === "vacant" && p.landlordId === LANDLORD && !APPLICATIONS.some((a) => a.tenantId === TENANT && a.propertyId === p.id),
)!;
const occupiedHome = PROPERTIES.find((p) => isPublic(p) && p.occupancy === "occupied")!;
const apply = (propertyId: string) => ({ propertyId, moveInDate: "2026-11-15", leaseYears: 2, message: "I'd love to rent this home.", documents: ["Employment letter.pdf"] });

describe("saved homes", () => {
  const unsaved = PROPERTIES.find((p) => isPublic(p) && !["p-vi-006", "p-mai-009", "p-gra-014"].includes(p.id))!;

  it("lists, adds and removes saved homes idempotently", async () => {
    const before = (await api.as(TENANT).get("/v1/me/saved")).body.items.length;
    expect(before).toBeGreaterThan(0);
    await api.as(TENANT).put(`/v1/me/saved/${unsaved.id}`);
    await api.as(TENANT).put(`/v1/me/saved/${unsaved.id}`);
    expect((await api.as(TENANT).get("/v1/me/saved")).body.items[0].id).toBe(unsaved.id);
    await api.as(TENANT).delete(`/v1/me/saved/${unsaved.id}`);
    expect((await api.as(TENANT).get("/v1/me/saved")).body.items).toHaveLength(before);
    expect((await api.as(TENANT).put("/v1/me/saved/does-not-exist")).status).toBe(404);
  });
});

describe("applications", () => {
  let appId: string;

  it("requires identity documents and an available home", async () => {
    const fresh = await api.anon.post("/v1/dev/signup", { role: "tenant", name: "No Docs", email: "nodocs@example.com", city: "Lagos" });
    expect((await api.withToken(fresh.body.token).post("/v1/tenant/applications", apply(freshHome.id))).body.error.code).toBe("identity_required");
    expect((await api.as(TENANT).post("/v1/tenant/applications", apply(occupiedHome.id))).body.error.code).toBe("not_available");
    expect((await api.as(LANDLORD).post("/v1/tenant/applications", apply(freshHome.id))).status).toBe(403);
  });

  it("applies, notifies the landlord, and blocks duplicates", async () => {
    const res = await api.as(TENANT).post("/v1/tenant/applications", apply(freshHome.id));
    expect(res.status).toBe(201);
    appId = res.body.application.id;
    expect(res.body.application).toMatchObject({ status: "pending", tenantId: TENANT, leaseYears: 2 });
    expect((await inbox(LANDLORD))[0]).toMatchObject({ title: "New application received", body: `Chiamaka Eze applied for ${freshHome.title}.` });
    expect((await api.as(TENANT).post("/v1/tenant/applications", apply(freshHome.id))).body.error.code).toBe("already_applied");
  });

  it("shows landlords only applications for their homes, with applicant profiles", async () => {
    const res = await api.as(LANDLORD).get("/v1/landlord/applications");
    const ids = new Set(res.body.properties.map((p: any) => p.id));
    expect(res.body.items.every((a: any) => ids.has(a.propertyId))).toBe(true);
    expect(res.body.properties.every((p: any) => p.landlordId === LANDLORD)).toBe(true);
    expect(res.body.tenants.find((t: any) => t.id === TENANT)).toMatchObject({ occupation: "Product Designer", email: "chiamaka.eze@example.com" });
    expect((await api.as("u-landlord-2").post(`/v1/landlord/applications/${appId}/decision`, { status: "approved" })).status).toBe(404);
  });

  it("approval raises the move-in invoice and asks the tenant to pay", async () => {
    const res = await api.as(LANDLORD).post(`/v1/landlord/applications/${appId}/decision`, { status: "approved", note: "Welcome!" });
    expect(res.body.application).toMatchObject({ status: "approved", landlordNote: "Welcome!" });
    const invoice = await prisma.paymentInvoice.findUniqueOrThrow({ where: { id: res.body.application.invoiceId }, include: { items: true } });
    const fees = moveInFees(freshHome, 2);
    expect(invoice.total).toBe(fees.total);
    expect(invoice.items.find((i) => i.key === "agency")?.amount).toBe(Math.round(freshHome.rent * 2 * 0.1));
    expect(invoice.reference).toMatch(/^HD-[A-Z2-9]{4}\d{4}$/);
    const [n] = await inbox(TENANT);
    expect(n).toMatchObject({ kind: "payment", href: "/tenant/payments" });
    expect(n!.body).toMatch(/10% agency fee/);
    expect((await api.as(LANDLORD).post(`/v1/landlord/applications/${appId}/decision`, { status: "rejected" })).body.error.code).toBe("already_decided");
    expect((await api.as(TENANT).delete(`/v1/tenant/applications/${appId}`)).body.error.code).toBe("cannot_withdraw");
  });

  it("rejects and withdraws", async () => {
    const other = PROPERTIES.find((p) => isPublic(p) && p.occupancy !== "occupied" && p.id !== freshHome.id && !APPLICATIONS.some((a) => a.tenantId === "u-tenant-6" && a.propertyId === p.id))!;
    const a1 = (await api.as("u-tenant-6").post("/v1/tenant/applications", apply(other.id))).body.application;
    await api.as(other.landlordId).post(`/v1/landlord/applications/${a1.id}/decision`, { status: "rejected", note: "Let to an earlier applicant." });
    expect((await inbox("u-tenant-6"))[0]?.title).toBe("Application update");

    const a2 = (await api.as("u-tenant-6").post("/v1/tenant/applications", apply(other.id))).body.application;
    expect((await api.as("u-tenant-2").delete(`/v1/tenant/applications/${a2.id}`)).status).toBe(404);
    expect((await api.as("u-tenant-6").delete(`/v1/tenant/applications/${a2.id}`)).body.ok).toBe(true);
    const mine = await api.as("u-tenant-6").get("/v1/tenant/applications");
    expect(mine.body.items.map((a: any) => a.id)).not.toContain(a2.id);
    expect(mine.body.properties.some((p: any) => p.id === other.id)).toBe(true);
  });
});

describe("waiting lists", () => {
  let id: string;
  const list = { city: "Lagos", areas: ["Lekki Phase 1"], propertyType: "Apartment", bedrooms: 2, minBudget: 3_000_000, maxBudget: 12_000_000, moveIn: "Within 1 month" };

  it("validates and creates", async () => {
    expect((await api.as(TENANT).post("/v1/tenant/waiting-lists", { ...list, minBudget: 20_000_000 })).status).toBe(400);
    const res = await api.as(TENANT).post("/v1/tenant/waiting-lists", list);
    expect(res.status).toBe(201);
    id = res.body.waitingList.id;
    expect(res.body.waitingList.status).toBe("active");
  });

  it("returns scored matches, best first", async () => {
    const res = await api.as(TENANT).get(`/v1/tenant/waiting-lists/${id}/matches`);
    const scores = res.body.items.map((m: any) => m.match.score);
    expect(scores.length).toBeGreaterThan(0);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(scores.every((s: number) => s >= 50)).toBe(true);
    expect(res.body.items[0].property.city).toBe("Lagos");
  });

  it("pauses and deletes only the tenant's own lists", async () => {
    expect((await api.as("u-tenant-6").patch(`/v1/tenant/waiting-lists/${id}`, { status: "paused" })).status).toBe(404);
    expect((await api.as(TENANT).patch(`/v1/tenant/waiting-lists/${id}`, { status: "paused" })).body.waitingList.status).toBe("paused");
    expect((await api.as(TENANT).delete(`/v1/tenant/waiting-lists/${id}`)).body.ok).toBe(true);
    expect((await api.as(TENANT).get("/v1/tenant/waiting-lists")).body.items.some((w: any) => w.id === id)).toBe(false);
  });
});
