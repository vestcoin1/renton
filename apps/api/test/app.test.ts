import { afterAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { loadEnv } from "../src/env.js";
import { ApiError } from "../src/lib/errors.js";
import { errorOf, makeApp, prisma } from "./helpers.js";

afterAll(() => prisma.$disconnect());

describe("GET /health", () => {
  it("reports ok when the database answers", async () => {
    const res = await makeApp().request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", db: "ok" });
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("returns 503 when the database is unreachable", async () => {
    const brokenDb = { $queryRaw: () => Promise.reject(new Error("connection refused")) } as never;
    const app = makeApp({ db: brokenDb });
    const res = await app.request("/health");
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ status: "degraded", db: "down" });
  });
});

describe("error responses", () => {
  const app = makeApp();
  app.get("/test/api-error", () => {
    throw ApiError.rule("refund_too_early", "Refunds open 30 days after notice.", { eligibleFrom: "2026-11-01" });
  });
  app.get("/test/zod", () => {
    z.object({ amount: z.number().min(5000) }).parse({ amount: 10 });
    return new Response();
  });
  app.get("/test/crash", () => {
    throw new Error("secret internals");
  });
  app.get("/test/duplicate", async () => {
    const profile = { role: "tenant" as const, name: "Dup", email: "dup@example.com", phone: "0", city: "Lagos" };
    await prisma.profile.deleteMany({ where: { email: profile.email } });
    await prisma.profile.create({ data: profile });
    await prisma.profile.create({ data: profile });
    return new Response();
  });

  it("uses the same envelope for unknown routes", async () => {
    const res = await app.request("/nope");
    expect(res.status).toBe(404);
    const error = await errorOf(res);
    expect(error).toMatchObject({ code: "not_found" });
    expect(error.requestId).toBe(res.headers.get("x-request-id"));
  });

  it("passes business-rule errors through with their code and details", async () => {
    const res = await app.request("/test/api-error");
    expect(res.status).toBe(422);
    expect((await errorOf(res))).toMatchObject({ code: "refund_too_early", details: { eligibleFrom: "2026-11-01" } });
  });

  it("maps validation errors to 400 with field paths", async () => {
    const res = await app.request("/test/zod");
    expect(res.status).toBe(400);
    const error = await errorOf(res);
    expect(error.code).toBe("validation_failed");
    expect(error.details[0].path).toBe("amount");
  });

  it("maps unique-constraint violations to 409", async () => {
    const res = await app.request("/test/duplicate");
    expect(res.status).toBe(409);
    expect((await errorOf(res)).code).toBe("conflict");
  });

  it("hides internals of unexpected errors", async () => {
    const res = await app.request("/test/crash");
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("secret internals");
    expect(JSON.parse(text).error.code).toBe("internal_error");
  });
});

describe("loadEnv", () => {
  it("fails fast with a readable message", () => {
    expect(() => loadEnv({ DATABASE_URL: "not a url" })).toThrow(/DATABASE_URL/);
  });

  it("splits CORS origins", () => {
    const env = loadEnv({ DATABASE_URL: "postgresql://x@localhost/db", CORS_ORIGINS: "http://a.com, http://b.com" });
    expect(env.CORS_ORIGINS).toEqual(["http://a.com", "http://b.com"]);
  });
});

describe("CORS", () => {
  it("allows configured origins only", async () => {
    const app = makeApp();
    const ok = await app.request("/health", { headers: { Origin: "http://localhost:3000" } });
    expect(ok.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    const blocked = await app.request("/health", { headers: { Origin: "http://evil.example" } });
    expect(blocked.headers.get("access-control-allow-origin")).toBeNull();
  });
});
