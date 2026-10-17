import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PROPERTIES } from "renton-core/mock/properties";
import { ALL_USERS } from "renton-core/mock/users";
import { seed } from "../prisma/seed.js";
import { prisma } from "./helpers.js";

beforeAll(() => seed(prisma));
afterAll(() => prisma.$disconnect());

describe("seed", () => {
  it("loads every mock user and property with its original ID", async () => {
    expect(await prisma.profile.count()).toBe(ALL_USERS.length);
    expect(await prisma.property.count()).toBe(PROPERTIES.length);
    const sample = PROPERTIES[0]!;
    const row = await prisma.property.findUniqueOrThrow({ where: { id: sample.id }, include: { images: { orderBy: { position: "asc" } } } });
    expect(row.images.map((i) => i.url)).toEqual(sample.images);
    expect(row.rent).toBe(sample.rent);
  });

  it("is repeatable", async () => {
    await seed(prisma);
    expect(await prisma.profile.count()).toBe(ALL_USERS.length);
  });

  it("links the demo tenant's tenancy end to end", async () => {
    const lease = await prisma.lease.findUniqueOrThrow({
      where: { id: "ls-5" },
      include: { rentReviews: { include: { offers: true } }, invoice: { include: { items: true, verifiedBy: true, receipt: true } }, rentPlans: { include: { contributions: true } } },
    });
    expect(lease.tenantId).toBe("u-tenant-1");
    expect(lease.rentReviews[0]?.offers).toHaveLength(1);
    expect(lease.invoice?.verifiedBy?.id).toBe("u-admin-1");
    expect(lease.invoice?.items.map((i) => i.key).sort()).toEqual(["agency", "caution", "rent"]);
    expect(lease.invoice?.receipt?.amountPaid).toBe(lease.invoice?.total);
    expect(lease.rentPlans[0]?.contributions).toHaveLength(6);
  });

  it("keeps the verification checklist keyed by its stable item IDs", async () => {
    const items = await prisma.verificationChecklistItem.findMany({ where: { requestId: "vr-501" }, orderBy: { position: "asc" } });
    expect(items[0]?.key).toBe("ck-title");
    expect(items.filter((i) => i.done)).toHaveLength(4);
  });

  it("rebuilds message threads with unread state for the tenant", async () => {
    const thread = await prisma.messageThread.findUniqueOrThrow({ where: { id: "t1" }, include: { participants: true, messages: true } });
    const tenant = thread.participants.find((p) => p.profileId === "u-tenant-1")!;
    const unread = thread.messages.filter((m) => m.senderId !== "u-tenant-1" && m.createdAt > tenant.lastReadAt!);
    expect(unread).toHaveLength(1);
  });

  it("gives each demo account its own notifications", async () => {
    const byProfile = await prisma.notification.groupBy({ by: ["profileId"], _count: true });
    expect(byProfile.map((g) => g.profileId).sort()).toEqual(["u-admin-1", "u-landlord-1", "u-tenant-1"]);
  });
});
