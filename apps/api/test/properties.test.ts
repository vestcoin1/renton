import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PROPERTIES, isPublic } from "renton-core/mock/properties";
import { filterProperties, filtersFromParams } from "renton-core/search";
import { seed } from "../prisma/seed.js";
import { ADMIN, client, inbox, LANDLORD, makeApp, prisma, TENANT } from "./helpers.js";

beforeAll(() => seed(prisma));
afterAll(() => prisma.$disconnect());

const api = client(makeApp());

const listing = (overrides: Record<string, unknown> = {}) => ({
  title: "Bright 2-Bedroom Flat in Yaba",
  type: "Apartment",
  description: "Newly renovated two-bedroom flat close to UNILAG with steady water and a prepaid meter.",
  city: "Lagos",
  area: "Yaba",
  address: "12 Herbert Macaulay Way, Yaba",
  rent: 3_200_000,
  serviceCharge: 250_000,
  cautionDeposit: 320_000,
  bedrooms: 2,
  bathrooms: 2,
  toilets: 3,
  sizeSqm: 120,
  furnished: false,
  parkingSpaces: 1,
  waterSupply: "Borehole",
  power: "Prepaid Meter",
  security: true,
  amenities: ["Borehole", "Prepaid Meter"],
  images: ["https://images.example.com/yaba-1.jpg"],
  availableFrom: "2026-11-01",
  ...overrides,
});

describe("public search", () => {
  const publicMock = PROPERTIES.filter(isPublic);
  const cases = ["", "city=Lagos", "city=Abuja&beds=3", "min=2000000&max=8000000&sort=price-asc", "q=lekki", "type=Duplex&parking=1", "water=1&security=1&furnished=1", "state=Rivers&sort=newest"];

  it.each(cases)("returns the same listings as filterProperties for ?%s", async (qs) => {
    const res = await api.anon.get(`/v1/properties?pageSize=100&${qs}`);
    expect(res.status).toBe(200);
    const expected = filterProperties(publicMock, filtersFromParams(new URLSearchParams(qs)));
    expect(res.body.items.map((p: any) => p.id).sort()).toEqual(expected.map((p) => p.id).sort());
    expect(res.body.total).toBe(expected.length);
  });

  it("sorts and paginates", async () => {
    const page1 = await api.anon.get("/v1/properties?sort=price-asc&pageSize=5");
    const rents = page1.body.items.map((p: any) => p.rent);
    expect(rents).toEqual([...rents].sort((a, b) => a - b));
    const page2 = await api.anon.get("/v1/properties?sort=price-asc&pageSize=5&page=2");
    expect(page2.body.items[0].rent).toBeGreaterThanOrEqual(rents[4]);
  });

  it("serves featured listings, similar homes and city counts", async () => {
    const featured = await api.anon.get("/v1/properties/featured");
    expect(featured.body.items.every((p: any) => p.featured)).toBe(true);

    const similar = await api.anon.get("/v1/properties/p-lek-001/similar?limit=3");
    expect(similar.body.items).toHaveLength(3);
    expect(similar.body.items.some((p: any) => p.id === "p-lek-001")).toBe(false);

    const cities = await api.anon.get("/v1/cities");
    const total = cities.body.items.reduce((n: number, c: any) => n + c.listings, 0);
    expect(total).toBe(publicMock.length);
    expect(cities.body.items.find((c: any) => c.name === "Port Harcourt").slug).toBe("port-harcourt");
  });

  it("shows a landlord's public profile without contact details", async () => {
    const res = await api.anon.get(`/v1/landlords/${LANDLORD}`);
    expect(res.body.landlord).toMatchObject({ name: "Ngozi Adeyemi", email: "", phone: "", company: "Adeyemi Homes Ltd" });
    expect(res.body.properties.every((p: any) => p.landlordId === LANDLORD)).toBe(true);
  });

  it("hides unpublished listings from everyone but their landlord and admins", async () => {
    const draft = PROPERTIES.find((p) => !isPublic(p))!;
    expect((await api.anon.get(`/v1/properties/${draft.id}`)).status).toBe(404);
    expect((await api.as(TENANT).get(`/v1/properties/${draft.id}`)).status).toBe(404);
    expect((await api.as(draft.landlordId).get(`/v1/properties/${draft.id}`)).status).toBe(200);
    expect((await api.as(ADMIN).get(`/v1/properties/${draft.id}`)).status).toBe(200);
    const detail = await api.anon.get("/v1/properties/p-lek-001");
    expect(detail.body.landlord.email).toBe("");
  });
});

describe("listing → verification → publish", () => {
  let propertyId: string;
  let vrId: string;

  it("requires submitted identity documents to list", async () => {
    const fresh = await api.anon.post("/v1/dev/signup", { role: "landlord", name: "New Landlord", email: "newlandlord@example.com", city: "Lagos" });
    const res = await api.withToken(fresh.body.token).post("/v1/landlord/properties", listing());
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("identity_required");
  });

  it("validates the listing", async () => {
    expect((await api.as(LANDLORD).post("/v1/landlord/properties", listing({ city: "Atlantis" }))).status).toBe(400);
    expect((await api.as(LANDLORD).post("/v1/landlord/properties", listing({ type: "Castle" }))).status).toBe(400);
    expect((await api.as(LANDLORD).post("/v1/landlord/properties", listing({ images: [] }))).status).toBe(400);
  });

  it("creates the listing in the admin queue and notifies the team", async () => {
    const res = await api.as(LANDLORD).post(
      "/v1/landlord/properties",
      listing({ documents: [{ name: "C_of_O.pdf", kind: "C of O", sizeKb: 1200, url: "data:application/pdf;base64,AA" }] }),
    );
    expect(res.status).toBe(201);
    propertyId = res.body.property.id;
    expect(res.body.property).toMatchObject({ verification: "submitted", occupancy: "vacant", state: "Lagos", landlordId: LANDLORD });

    const queue = await api.as(ADMIN).get("/v1/admin/verifications?stage=submitted");
    const entry = queue.body.items.find((i: any) => i.property.id === propertyId);
    vrId = entry.verification.id;
    expect(entry.verification.checklist).toHaveLength(7);
    expect(entry.verification.documents[0]).toMatchObject({ kind: "C of O", status: "pending" });
    expect((await inbox(ADMIN))[0]?.href).toBe(`/admin/verifications/${vrId}`);
    expect((await api.anon.get(`/v1/properties/${propertyId}`)).status).toBe(404);
  });

  it("enforces the stage order", async () => {
    const skip = await api.as(ADMIN).post(`/v1/admin/properties/${propertyId}/stage`, { stage: "published" });
    expect(skip.status).toBe(422);
    expect(skip.body.error.code).toBe("invalid_transition");
    expect((await api.as(LANDLORD).post(`/v1/admin/properties/${propertyId}/stage`, { stage: "inspection_scheduled" })).status).toBe(403);
  });

  it("requests changes with a note; the landlord edits and resubmits", async () => {
    expect((await api.as(ADMIN).post(`/v1/admin/properties/${propertyId}/stage`, { stage: "changes_requested" })).status).toBe(400);
    await api.as(ADMIN).post(`/v1/admin/properties/${propertyId}/stage`, { stage: "changes_requested", note: "Add photos of the kitchen." });
    const [n] = await inbox(LANDLORD);
    expect(n).toMatchObject({ title: "Changes requested", body: "Bright 2-Bedroom Flat in Yaba: Add photos of the kitchen." });

    const edited = await api.as(LANDLORD).patch(`/v1/landlord/properties/${propertyId}`, { images: ["https://images.example.com/yaba-1.jpg", "https://images.example.com/kitchen.jpg"] });
    expect(edited.body.property.images).toHaveLength(2);
    expect((await api.as("u-landlord-2").patch(`/v1/landlord/properties/${propertyId}`, { title: "Hijacked listing" })).status).toBe(404);
    await api.as(LANDLORD).post(`/v1/landlord/properties/${propertyId}/submit`);
    expect((await api.as(LANDLORD).patch(`/v1/landlord/properties/${propertyId}`, { title: "Too late to edit" })).body.error.code).toBe("listing_locked");
  });

  it("works the checklist, documents and internal notes", async () => {
    await api.as(ADMIN).patch(`/v1/admin/verifications/${vrId}/checklist/ck-title`, { done: true });
    const noted = await api.as(ADMIN).post(`/v1/admin/verifications/${vrId}/notes`, { body: "Title confirmed at the land registry." });
    expect(noted.body.verification.notes.at(-1)).toMatchObject({ author: "Ibrahim Lawal" });
    const docId = noted.body.verification.documents[0].id;
    const doc = await api.as(ADMIN).patch(`/v1/admin/verifications/${vrId}/documents/${docId}`, { status: "verified" });
    expect(doc.body.verification.documents[0].status).toBe("verified");
    expect(doc.body.verification.checklist.find((i: any) => i.id === "ck-title").done).toBe(true);

    // The landlord sees progress but not the team's notes.
    const mine = await api.as(LANDLORD).get(`/v1/landlord/properties/${propertyId}/verification`);
    expect(mine.body.verification.notes).toEqual([]);
    expect(mine.body.verification.stage).toBe("submitted");
  });

  it("inspects, publishes, notifies the landlord and matching waiting-list tenants", async () => {
    await prisma.waitingList.create({
      data: { tenantId: "u-tenant-5", city: "Lagos", areas: ["Yaba"], propertyType: "Apartment", bedrooms: 2, minBudget: 2_000_000, maxBudget: 4_000_000, moveIn: "Immediately" },
    });
    await prisma.waitingList.create({
      data: { tenantId: "u-tenant-6", city: "Lagos", areas: ["Ikoyi"], propertyType: "Duplex", bedrooms: 5, minBudget: 20_000_000, maxBudget: 30_000_000, moveIn: "Flexible" },
    });

    const scheduled = await api.as(ADMIN).post(`/v1/admin/properties/${propertyId}/stage`, { stage: "inspection_scheduled", inspector: "Segun Adebayo", inspectionDate: "2026-10-12T10:00:00.000Z" });
    expect(scheduled.body.verification).toMatchObject({ stage: "inspection_scheduled", inspector: "Segun Adebayo" });
    await api.as(ADMIN).post(`/v1/admin/properties/${propertyId}/stage`, { stage: "under_review" });
    const published = await api.as(ADMIN).post(`/v1/admin/properties/${propertyId}/stage`, { stage: "published" });
    expect(published.body.property.verification).toBe("published");
    expect(published.body.property.verifiedAt).toBeTruthy();
    // u-tenant-5's new list, plus the seeded wl-1 (Lagos, 2-bed apartment, ₦4–10M), which scores 84.
    expect(published.body.matched).toBe(2);
    expect((await inbox(TENANT))[0]?.kind).toBe("match");

    expect((await inbox(LANDLORD))[0]?.title).toBe("Listing is now live");
    const [match] = await inbox("u-tenant-5");
    expect(match).toMatchObject({ kind: "match", href: `/properties/${propertyId}` });
    expect(match!.title).toMatch(/^New \d+% match in Yaba$/);
    expect((await inbox("u-tenant-6")).some((n) => n.href === `/properties/${propertyId}`)).toBe(false);

    expect((await api.anon.get(`/v1/properties/${propertyId}`)).status).toBe(200);
    expect((await api.as(ADMIN).post(`/v1/admin/properties/${propertyId}/stage`, { stage: "under_review" })).status).toBe(422);
  });

  it("lets the landlord update occupancy and admins feature a listing", async () => {
    const occ = await api.as(LANDLORD).patch(`/v1/landlord/properties/${propertyId}/occupancy`, { occupancy: "available_soon", availableFrom: "2026-12-01" });
    expect(occ.body.property).toMatchObject({ occupancy: "available_soon", availableFrom: "2026-12-01T00:00:00.000Z" });
    expect((await api.as("u-landlord-2").patch(`/v1/landlord/properties/${propertyId}/occupancy`, { occupancy: "vacant" })).status).toBe(404);
    expect((await api.as(ADMIN).patch(`/v1/admin/properties/${propertyId}`, { featured: true })).body.property.featured).toBe(true);
    const mine = await api.as(LANDLORD).get("/v1/landlord/properties");
    expect(mine.body.items.every((p: any) => p.landlordId === LANDLORD)).toBe(true);
  });

  it("takes down a seeded live listing that has no verification request", async () => {
    const res = await api.as(ADMIN).post("/v1/admin/properties/p-lek-001/stage", { stage: "rejected", note: "Fraud report confirmed." });
    expect(res.status).toBe(200);
    expect(res.body.verification.checklist).toHaveLength(7);
    expect((await api.anon.get("/v1/properties/p-lek-001")).status).toBe(404);
  });
});
