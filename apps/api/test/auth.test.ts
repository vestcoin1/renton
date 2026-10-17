import { randomUUID } from "node:crypto";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seed } from "../prisma/seed.js";
import { createAuthVerifier } from "../src/auth/verifier.js";
import type { Storage } from "../src/lib/storage.js";
import { ADMIN, client, env, inbox, LANDLORD, makeApp, prisma, supabaseToken, TENANT } from "./helpers.js";

beforeAll(() => seed(prisma));
afterAll(() => prisma.$disconnect());

const app = makeApp();
const api = client(app);

describe("token verification", () => {
  it("requires a token for protected routes", async () => {
    const res = await api.anon.get("/v1/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("rejects malformed, expired and wrongly signed tokens", async () => {
    expect((await api.withToken("not-a-jwt").get("/v1/me")).status).toBe(401);
    const expired = await supabaseToken(randomUUID(), "x@example.com", { expiresIn: "-1m" });
    expect((await api.withToken(expired).get("/v1/me")).status).toBe(401);
    const forged = await supabaseToken(randomUUID(), "x@example.com", { secret: "some-other-secret-0123456789abcdefghij" });
    expect((await api.withToken(forged).get("/v1/me")).status).toBe(401);
  });

  it("verifies asymmetric (JWKS) Supabase tokens and checks the issuer", async () => {
    const { publicKey, privateKey } = await generateKeyPair("ES256");
    const jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: "k1", alg: "ES256" }] });
    const supabaseUrl = "https://proj.supabase.co";
    const jwksApp = client(makeApp({ auth: createAuthVerifier({ ...env, SUPABASE_URL: supabaseUrl }, { jwks }) }));
    const sign = (iss: string) =>
      new SignJWT({ email: "jwks@example.com" })
        .setProtectedHeader({ alg: "ES256", kid: "k1" })
        .setSubject(randomUUID())
        .setIssuer(iss)
        .setAudience("authenticated")
        .setExpirationTime("1h")
        .sign(privateKey);
    // A valid token for an account with no profile yet gets past auth to profile_required.
    const ok = await jwksApp.withToken(await sign(`${supabaseUrl}/auth/v1`)).get("/v1/me");
    expect(ok.body.error.code).toBe("profile_required");
    expect((await jwksApp.withToken(await sign("https://evil.example/auth/v1")).get("/v1/me")).status).toBe(401);
  });

  it("refuses development tokens when DEV_AUTH is off", async () => {
    const strict = client(makeApp({ auth: createAuthVerifier({ ...env, DEV_AUTH: false }) }));
    expect((await strict.as(TENANT).get("/v1/me")).status).toBe(401);
  });
});

describe("sign-up and profiles", () => {
  const sub = randomUUID();
  let token: string;
  beforeAll(async () => {
    token = await supabaseToken(sub, "Amaka@Example.com");
  });

  it("asks a new Supabase account to finish sign-up, then creates the profile", async () => {
    expect((await api.withToken(token).get("/v1/me")).body.error.code).toBe("profile_required");

    const created = await api.withToken(token).post("/v1/me", { role: "tenant", name: " Amaka Obi ", phone: "+234 801 000 0000", city: "Lagos" });
    expect(created.status).toBe(201);
    expect(created.body.user).toMatchObject({ role: "tenant", name: "Amaka Obi", email: "amaka@example.com", identity: { status: "unverified" } });

    const me = await api.withToken(token).get("/v1/me");
    expect(me.status).toBe(200);
    expect(me.body.user.occupation).toBe("");
    const [first] = await inbox(me.body.user.id);
    expect(first?.href).toBe("/tenant/verify");
  });

  it("rejects a second profile and duplicate emails", async () => {
    expect((await api.withToken(token).post("/v1/me", { role: "landlord", name: "Again", city: "Lagos" })).body.error.code).toBe("profile_exists");
    const other = await supabaseToken(randomUUID(), "amaka@example.com");
    expect((await api.withToken(other).post("/v1/me", { role: "landlord", name: "Dup", city: "Lagos" })).body.error.code).toBe("email_in_use");
  });

  it("validates sign-up input and refuses admin self-registration", async () => {
    const t = await supabaseToken(randomUUID(), "new@example.com");
    expect((await api.withToken(t).post("/v1/me", { role: "tenant", name: "A", city: "Lagos" })).status).toBe(400);
    expect((await api.withToken(t).post("/v1/me", { role: "admin", name: "Sneaky", city: "Lagos" })).status).toBe(400);
  });

  it("updates role-specific profile fields", async () => {
    const res = await api.withToken(token).patch("/v1/me", { phone: "+234 802", tenant: { occupation: "Nurse", monthlyIncome: 450000 }, landlord: { residence: "ignored" } });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ phone: "+234 802", occupation: "Nurse", monthlyIncome: 450000 });
  });
});

describe("roles and account status", () => {
  it("keeps tenants out of admin routes", async () => {
    expect((await api.as(TENANT).get("/v1/admin/users")).status).toBe(403);
    expect((await api.as(ADMIN).get("/v1/admin/users?role=landlord")).body.items.every((u: any) => u.role === "landlord")).toBe(true);
  });

  it("lets admins suspend users, which blocks them, but not themselves", async () => {
    expect((await api.as(ADMIN).patch("/v1/admin/users/u-tenant-5", { status: "suspended" })).status).toBe(200);
    expect((await api.as("u-tenant-5").get("/v1/me")).body.error.code).toBe("account_suspended");
    await api.as(ADMIN).patch("/v1/admin/users/u-tenant-5", { status: "active" });
    expect((await api.as("u-tenant-5").get("/v1/me")).status).toBe(200);
    expect((await api.as(ADMIN).patch(`/v1/admin/users/${ADMIN}`, { status: "suspended" })).body.error.code).toBe("cannot_change_self");
  });
});

describe("identity verification", () => {
  const doc = (kind: string) => ({ kind, name: `${kind}.jpg`, fileKind: "image", url: "data:image/jpeg;base64,AAA" });
  let tenantId: string;
  let t: ReturnType<typeof api.withToken>;

  beforeAll(async () => {
    t = api.withToken(await supabaseToken(randomUUID(), "kyc@example.com"));
    tenantId = (await t.post("/v1/me", { role: "tenant", name: "Kemi Ade", city: "Lagos" })).body.user.id;
  });

  it("requires every document for the role", async () => {
    const res = await t.post("/v1/me/identity", { idType: "NIN", idNumber: "12345678901", documents: [doc("government_id"), doc("proof_of_income")] });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({ code: "missing_documents", details: { missing: ["selfie"] } });
    const wrongRole = await t.post("/v1/me/identity", { idType: "NIN", idNumber: "12345678901", documents: [doc("government_id"), doc("selfie"), doc("proof_of_income"), doc("proof_of_address")] });
    expect(wrongRole.status).toBe(400);
  });

  it("submit → reject with reason → resubmit → approve", async () => {
    const full = { idType: "NIN", idNumber: "12345678901", documents: [doc("government_id"), doc("selfie"), doc("proof_of_income")] };
    const submitted = await t.post("/v1/me/identity", full);
    expect(submitted.body.user.identity).toMatchObject({ status: "pending", idNumber: "12345678901" });
    expect(submitted.body.user.identity.documents).toHaveLength(3);
    expect((await inbox(ADMIN))[0]?.href).toBe(`/admin/users?review=${tenantId}`);

    // Admins see the documents; landlords listing users don't exist, and other roles can't reach this.
    expect((await api.as(ADMIN).get(`/v1/admin/users/${tenantId}`)).body.user.identity.documents).toHaveLength(3);

    expect((await api.as(ADMIN).post(`/v1/admin/users/${tenantId}/identity-review`, { approved: false })).status).toBe(400);
    await api.as(ADMIN).post(`/v1/admin/users/${tenantId}/identity-review`, { approved: false, reason: "The ID photo is blurry." });
    expect((await t.get("/v1/me")).body.user.identity).toMatchObject({ status: "rejected", rejectionReason: "The ID photo is blurry.", reviewedBy: "Ibrahim Lawal" });
    expect((await inbox(tenantId))[0]?.body).toMatch(/blurry/);
    expect((await api.as(ADMIN).post(`/v1/admin/users/${tenantId}/identity-review`, { approved: true })).body.error.code).toBe("not_pending");

    await t.post("/v1/me/identity", full);
    await api.as(ADMIN).post(`/v1/admin/users/${tenantId}/identity-review`, { approved: true });
    const me = (await t.get("/v1/me")).body.user;
    expect(me.identity.status).toBe("verified");
    expect(me.identityVerified).toBe(true);
    expect((await t.post("/v1/me/identity", full)).body.error.code).toBe("already_verified");
  });

  it("lists pending submissions for the review queue", async () => {
    const res = await api.as(ADMIN).get("/v1/admin/users?identity=pending");
    expect(res.body.items.every((u: any) => u.identity?.status === "pending")).toBe(true);
  });
});

describe("uploads", () => {
  it("is unavailable without storage", async () => {
    const res = await api.as(TENANT).post("/v1/uploads", { purpose: "identity", fileName: "id.jpg", contentType: "image/jpeg", sizeBytes: 1000 });
    expect(res.status).toBe(501);
  });

  describe("with storage", () => {
    const fake: Storage = {
      createUploadUrl: async (bucket, path) => ({ uploadUrl: `https://storage.test/upload/${bucket}/${path}?token=t` }),
      createDownloadUrl: async (bucket, path) => `https://storage.test/signed/${bucket}/${path}`,
      publicUrl: (bucket, path) => `https://storage.test/public/${bucket}/${path}`,
    };
    const s = client(makeApp({ storage: fake }));

    it("issues upload URLs in the user's own folder and validates type and size", async () => {
      const res = await s.as(LANDLORD).post("/v1/uploads", { purpose: "identity", fileName: "my id.jpg", contentType: "image/jpeg", sizeBytes: 2048 });
      expect(res.status).toBe(201);
      expect(res.body.ref).toMatch(new RegExp(`^storage:identity-documents/${LANDLORD}/[\\w-]+-my_id\\.jpg$`));
      expect(res.body.uploadUrl).toContain("https://storage.test/upload/");
      expect((await s.as(LANDLORD).post("/v1/uploads", { purpose: "identity", fileName: "x.exe", contentType: "application/x-msdownload", sizeBytes: 10 })).status).toBe(400);
      expect((await s.as(LANDLORD).post("/v1/uploads", { purpose: "identity", fileName: "x.pdf", contentType: "application/pdf", sizeBytes: 50 * 1024 * 1024 })).status).toBe(400);
      expect((await s.as(LANDLORD).post("/v1/uploads", { purpose: "receipt", fileName: "r.png", contentType: "image/png", sizeBytes: 10 })).status).toBe(403);
    });

    it("only accepts the user's own storage references, and returns signed URLs", async () => {
      const t = s.withToken(await supabaseToken(randomUUID(), "storage-user@example.com"));
      const id = (await t.post("/v1/me", { role: "landlord", name: "Store User", city: "Abuja" })).body.user.id;
      const own = (kind: string) => ({ kind, name: `${kind}.pdf`, fileKind: "pdf", url: `storage:identity-documents/${id}/abc-${kind}.pdf` });
      const stolen = { ...own("government_id"), url: `storage:identity-documents/${TENANT}/abc-id.pdf` };
      expect((await t.post("/v1/me/identity", { idType: "NIN", idNumber: "1234567", documents: [stolen, own("proof_of_address")] })).status).toBe(400);
      expect((await t.post("/v1/me/identity", { idType: "NIN", idNumber: "1234567", documents: [{ ...own("government_id"), url: "data:image/png;base64,AA" }, own("proof_of_address")] })).status).toBe(400);
      const ok = await t.post("/v1/me/identity", { idType: "NIN", idNumber: "1234567", documents: [own("government_id"), own("proof_of_address")] });
      expect(ok.status).toBe(200);
      expect(ok.body.user.identity.documents[0].url).toBe(`https://storage.test/signed/identity-documents/${id}/abc-government_id.pdf`);
      // Stored as the reference, not the expiring URL.
      expect((await prisma.identityDocument.findFirstOrThrow({ where: { verificationId: id } })).url).toMatch(/^storage:/);
    });
  });
});

describe("notifications", () => {
  it("lists the user's own inbox, newest first, and marks items read", async () => {
    const list = await api.as(LANDLORD).get("/v1/notifications");
    expect(list.body.items.length).toBeGreaterThan(0);
    const unreadBefore = list.body.unreadCount;
    const target = list.body.items.find((n: any) => !n.read);
    await api.as(LANDLORD).post(`/v1/notifications/${target.id}/read`);
    expect((await api.as(LANDLORD).get("/v1/notifications")).body.unreadCount).toBe(unreadBefore - 1);
    // Someone else's notification looks like it doesn't exist.
    expect((await api.as(TENANT).post(`/v1/notifications/${target.id}/read`)).status).toBe(404);
    await api.as(LANDLORD).post("/v1/notifications/read-all");
    expect((await api.as(LANDLORD).get("/v1/notifications?unread=true")).body.items).toHaveLength(0);
  });
});

describe("development sign-in", () => {
  it("issues tokens for demo roles and creates accounts without passwords", async () => {
    const session = await api.anon.post("/v1/dev/session", { role: "landlord" });
    expect(session.body.user.id).toBe(LANDLORD);
    expect((await api.withToken(session.body.token).get("/v1/me")).body.user.email).toBe("ngozi.adeyemi@example.com");
    const signup = await api.anon.post("/v1/dev/signup", { role: "landlord", name: "Dev Landlord", email: "dev@example.com", city: "Uyo" });
    expect(signup.status).toBe(201);
    expect((await api.withToken(signup.body.token).get("/v1/me")).body.user.residence).toBe("Uyo, Nigeria");
  });
});
