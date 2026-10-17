import { Hono } from "hono";
import { IDENTITY_REQUIREMENTS, ID_TYPES, missingDocuments } from "renton-core/identity";
import type { IdentityDocumentKind } from "renton-shared/types";
import { z } from "zod";
import { findProfile, identityState, requireUser } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";
import { ApiError } from "../lib/errors.js";
import { assertOwnFile } from "../lib/storage.js";
import { body } from "../lib/validate.js";
import { profileInclude, toUser } from "../mappers.js";
import { createProfile } from "../services/accounts.js";
import { ADMINS, notify } from "../services/notifications.js";
import { presentUser } from "../services/present.js";

const createSchema = z.object({
  role: z.enum(["tenant", "landlord"]),
  name: z.string().trim().min(2, "Enter your full name.").max(100),
  phone: z.string().trim().max(40).default(""),
  city: z.string().trim().min(1).max(60),
});

const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(40).optional(),
  city: z.string().trim().min(1).max(60).optional(),
  avatarHue: z.number().int().min(0).max(359).optional(),
  tenant: z
    .object({
      occupation: z.string().trim().max(100),
      employer: z.string().trim().max(100),
      employmentType: z.enum(["Full-time", "Self-employed", "Contract", "Student"]),
      monthlyIncome: z.number().int().nonnegative(),
      maritalStatus: z.enum(["Single", "Married"]),
      householdSize: z.number().int().min(1).max(30),
      guarantor: z.string().trim().max(100).nullable(),
    })
    .partial()
    .optional(),
  landlord: z
    .object({
      company: z.string().trim().max(120).nullable(),
      isDiaspora: z.boolean(),
      residence: z.string().trim().max(120),
    })
    .partial()
    .optional(),
});

const DOCUMENT_KINDS = ["government_id", "selfie", "proof_of_income", "proof_of_address", "cac_certificate"] as const;

const identitySchema = z.object({
  idType: z.enum(ID_TYPES as [string, ...string[]]),
  idNumber: z.string().trim().min(4).max(40),
  documents: z
    .array(z.object({ kind: z.enum(DOCUMENT_KINDS), name: z.string().trim().min(1).max(200), fileKind: z.enum(["image", "pdf"]), url: z.string().min(1) }))
    .min(1)
    .max(6),
});

export const me = new Hono<AppEnv>()
  /** The signed-in user, including their own identity documents. 403 `profile_required` until POST /me. */
  .get("/", requireUser(), async (c) => {
    const { db, storage } = c.get("deps");
    const row = await db.profile.findUniqueOrThrow({ where: { id: c.get("user").id }, include: profileInclude });
    return c.json({ user: await presentUser(storage, row, { withDocuments: true }) });
  })

  /** Finishes sign-up: links the Supabase account to a new tenant or landlord profile. */
  .post("/", async (c) => {
    const { db, now } = c.get("deps");
    const auth = c.get("auth");
    if (!auth) throw ApiError.unauthorized();
    if (!auth.authUserId || !auth.email) throw ApiError.badRequest("Sign up with Supabase Auth (email and password) first.");
    if (await findProfile(db, auth)) throw ApiError.conflict("Your account is already set up.", "profile_exists");
    const input = await body(c, createSchema);
    const profile = await db.$transaction((tx) => createProfile(tx, now(), { ...input, email: auth.email!, authUserId: auth.authUserId }));
    return c.json({ user: toUser(profile, { withDocuments: true }) }, 201);
  })

  .patch("/", requireUser(), async (c) => {
    const { db, storage } = c.get("deps");
    const user = c.get("user");
    const input = await body(c, updateSchema);
    const row = await db.profile.update({
      where: { id: user.id },
      data: {
        name: input.name,
        phone: input.phone,
        city: input.city,
        avatarHue: input.avatarHue,
        ...(user.role === "tenant" && input.tenant ? { tenantProfile: { update: input.tenant } } : {}),
        ...(user.role === "landlord" && input.landlord ? { landlordProfile: { update: input.landlord } } : {}),
      },
      include: profileInclude,
    });
    return c.json({ user: await presentUser(storage, row, { withDocuments: true }) });
  })

  /** KYC submission: role-specific documents → pending review. Re-submitting after a rejection replaces the documents. */
  .post("/identity", requireUser("tenant", "landlord"), async (c) => {
    const { db, storage, now } = c.get("deps");
    const user = c.get("user");
    const role = user.role as "tenant" | "landlord";
    const input = await body(c, identitySchema);

    if (identityState(user) === "verified") throw ApiError.conflict("Your identity is already verified.", "already_verified");

    const kinds = input.documents.map((d) => d.kind as IdentityDocumentKind);
    const allowed = new Set(IDENTITY_REQUIREMENTS[role].map((r) => r.kind));
    const extra = kinds.filter((k) => !allowed.has(k));
    if (extra.length) throw ApiError.badRequest(`${role === "tenant" ? "Tenants" : "Landlords"} don't upload: ${extra.join(", ")}.`);
    if (new Set(kinds).size !== kinds.length) throw ApiError.badRequest("Upload one file per document type.");
    const missing = missingDocuments(role, kinds);
    if (missing.length) {
      throw ApiError.rule("missing_documents", `Still needed: ${missing.map((m) => m.label).join(", ")}.`, { missing: missing.map((m) => m.kind) });
    }
    for (const d of input.documents) assertOwnFile(storage, "identity", user.id, d.url);

    const at = now();
    const row = await db.$transaction(async (tx) => {
      await tx.identityVerification.upsert({
        where: { profileId: user.id },
        create: { profileId: user.id, status: "pending", idType: input.idType, idNumber: input.idNumber, submittedAt: at },
        update: { status: "pending", idType: input.idType, idNumber: input.idNumber, submittedAt: at, reviewedAt: null, reviewedById: null, rejectionReason: null },
      });
      await tx.identityDocument.deleteMany({ where: { verificationId: user.id } });
      await tx.identityDocument.createMany({
        data: input.documents.map((d) => ({ verificationId: user.id, kind: d.kind, name: d.name, fileKind: d.fileKind, url: d.url, uploadedAt: at })),
      });
      await tx.profile.update({ where: { id: user.id }, data: { identityVerified: false } });
      await notify(tx, at, [
        [
          ADMINS,
          {
            title: "Identity documents to review",
            body: `${user.name} (${role}) submitted ${input.documents.length} document${input.documents.length === 1 ? "" : "s"} for verification.`,
            kind: "verification",
            href: `/admin/users?review=${user.id}`,
          },
        ],
      ]);
      return tx.profile.findUniqueOrThrow({ where: { id: user.id }, include: profileInclude });
    });
    return c.json({ user: await presentUser(storage, row, { withDocuments: true }) });
  });
