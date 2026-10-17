/** The typed client (packages/api-client) against the real app, with fetch routed into app.request. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClientError, createApiClient } from "renton-api-client";
import { seed } from "../prisma/seed.js";
import { makeApp, prisma } from "./helpers.js";

beforeAll(() => seed(prisma));
afterAll(() => prisma.$disconnect());

const app = makeApp();
const fetchViaApp: typeof fetch = (input, init) => Promise.resolve(app.request(String(input), init as RequestInit));
let token: string | null = null;
const api = createApiClient({ baseUrl: "http://api.test/", getToken: () => token, fetch: fetchViaApp });

describe("renton-api-client", () => {
  it("searches with the web app's filter shape", async () => {
    const res = await api.properties.search({ city: "Lagos", bedrooms: 3, sort: "price-asc" }, 1, 5);
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.every((p) => p.city === "Lagos" && p.bedrooms >= 3)).toBe(true);
  });

  it("signs in with a dev session and calls protected endpoints", async () => {
    token = (await api.dev.session({ role: "tenant" })).token;
    const { user } = await api.me.get();
    expect(user.name).toBe("Chiamaka Eze");
    const { leases, rentPlans } = await api.tenant.tenancy();
    expect(leases.some((l) => l.id === "ls-5")).toBe(true);
    expect(rentPlans[0]?.contributions.length).toBeGreaterThan(0);
  });

  it("surfaces API errors with their stable code", async () => {
    const err = await api.tenant.requestRefund("ls-5", { bankName: "GTBank", accountNumber: "0123456789", accountName: "Chiamaka Eze" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err).toMatchObject({ status: 422, code: "notice_required" });
    token = null;
    await expect(api.me.get()).rejects.toMatchObject({ status: 401, code: "unauthorized" });
  });
});
