import type { Prisma } from "@prisma/client";
import { Hono } from "hono";
import { DEFAULT_CHECKLIST } from "renton-core/mock/records";
import type { VerificationStage } from "renton-shared/types";
import { z } from "zod";
import { requireUser } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";
import { ApiError } from "../lib/errors.js";
import { viewUrl } from "../lib/storage.js";
import { body, isoDate, query } from "../lib/validate.js";
import { profileInclude, propertyInclude, toProperty, toUser, toVerification, verificationInclude } from "../mappers.js";
import { notifyWaitingListMatches } from "../services/matching.js";
import { notify } from "../services/notifications.js";

const PUBLIC: VerificationStage[] = ["verified", "published"];
const STAGES = ["draft", "submitted", "inspection_scheduled", "under_review", "verified", "published", "changes_requested", "rejected"] as const;

/**
 * Moves the admin team may make. The happy path follows VERIFICATION_FLOW (renton-core/status);
 * "Approve & publish" goes straight from under_review to published; changes can be requested or the
 * listing rejected at any open stage; a published listing can only be taken down.
 */
export const ADMIN_TRANSITIONS: Record<VerificationStage, VerificationStage[]> = {
  draft: ["submitted", "changes_requested", "rejected"],
  submitted: ["inspection_scheduled", "changes_requested", "rejected"],
  inspection_scheduled: ["under_review", "changes_requested", "rejected"],
  under_review: ["verified", "published", "changes_requested", "rejected"],
  verified: ["published", "changes_requested", "rejected"],
  changes_requested: ["submitted", "rejected"],
  published: ["rejected"],
  rejected: [],
};

const LANDLORD_LABELS: Partial<Record<VerificationStage, string>> = {
  inspection_scheduled: "Inspection scheduled",
  under_review: "Listing under review",
  verified: "Listing verified ✔",
  published: "Listing is now live",
  changes_requested: "Changes requested",
  rejected: "Listing rejected",
};

const stageSchema = z
  .object({
    stage: z.enum(STAGES),
    note: z.string().trim().max(2000).optional(),
    inspector: z.string().trim().min(2).max(100).optional(),
    inspectionDate: isoDate.optional(),
  })
  .refine((v) => !(v.stage === "changes_requested" || v.stage === "rejected") || !!v.note, { message: "Tell the landlord why.", path: ["note"] });

async function loadRequest(db: AppEnv["Variables"]["deps"]["db"], id: string) {
  const vr = await db.verificationRequest.findUnique({ where: { id }, include: verificationInclude });
  if (!vr) throw ApiError.notFound("Verification request");
  return vr;
}

export const adminVerifications = new Hono<AppEnv>()
  .use(requireUser("admin"))

  /** The queue: each request with its listing and the landlord's name and identity status. */
  .get("/", async (c) => {
    const { db } = c.get("deps");
    const { stage } = query(c, z.object({ stage: z.enum(STAGES).optional() }));
    const rows = await db.verificationRequest.findMany({
      where: { stage },
      include: { ...verificationInclude, property: { include: { ...propertyInclude, landlord: { include: profileInclude } } } },
      orderBy: [{ submittedAt: "desc" }, { id: "asc" }],
    });
    return c.json({
      items: rows.map(({ property, ...vr }) => ({
        verification: toVerification(vr),
        property: toProperty(property),
        landlord: toUser(property.landlord),
      })),
    });
  })

  .get("/:id", async (c) => {
    const { db, storage } = c.get("deps");
    const vr = await loadRequest(db, c.req.param("id"));
    const property = await db.property.findUniqueOrThrow({ where: { id: vr.propertyId }, include: { ...propertyInclude, landlord: { include: profileInclude } } });
    const verification = toVerification(vr);
    const urls = new Map(await Promise.all(vr.documents.map(async (d) => [d.id, d.url ? await viewUrl(storage, d.url) : null] as const)));
    return c.json({
      verification: { ...verification, documents: verification.documents.map((d) => ({ ...d, url: urls.get(d.id) ?? undefined })) },
      property: toProperty(property),
      landlord: toUser(property.landlord),
    });
  })

  .patch("/:id", async (c) => {
    const { db } = c.get("deps");
    const input = await body(
      c,
      z.object({
        priority: z.enum(["high", "normal", "low"]).optional(),
        inspector: z.string().trim().max(100).nullable().optional(),
        inspectionDate: isoDate.nullable().optional(),
        riskFlags: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
      }),
    );
    await loadRequest(db, c.req.param("id"));
    const data: Prisma.VerificationRequestUpdateInput = {
      priority: input.priority,
      inspector: input.inspector,
      riskFlags: input.riskFlags,
      ...(input.inspectionDate !== undefined ? { inspectionDate: input.inspectionDate ? new Date(input.inspectionDate) : null } : {}),
    };
    const vr = await db.verificationRequest.update({ where: { id: c.req.param("id") }, data, include: verificationInclude });
    return c.json({ verification: toVerification(vr) });
  })

  .patch("/:id/checklist/:key", async (c) => {
    const { db } = c.get("deps");
    const { done } = await body(c, z.object({ done: z.boolean() }));
    const { count } = await db.verificationChecklistItem.updateMany({ where: { requestId: c.req.param("id"), key: c.req.param("key") }, data: { done } });
    if (count === 0) throw ApiError.notFound("Checklist item");
    return c.json({ verification: toVerification(await loadRequest(db, c.req.param("id"))) });
  })

  .post("/:id/notes", async (c) => {
    const { db, now } = c.get("deps");
    const { body: text } = await body(c, z.object({ body: z.string().trim().min(1).max(4000) }));
    await loadRequest(db, c.req.param("id"));
    await db.verificationNote.create({ data: { requestId: c.req.param("id"), authorName: c.get("user").name, body: text, createdAt: now() } });
    return c.json({ verification: toVerification(await loadRequest(db, c.req.param("id"))) }, 201);
  })

  .patch("/:id/documents/:docId", async (c) => {
    const { db } = c.get("deps");
    const { status } = await body(c, z.object({ status: z.enum(["verified", "pending", "flagged"]) }));
    const { count } = await db.verificationDocument.updateMany({ where: { id: c.req.param("docId"), requestId: c.req.param("id") }, data: { status } });
    if (count === 0) throw ApiError.notFound("Document");
    return c.json({ verification: toVerification(await loadRequest(db, c.req.param("id"))) });
  });

/** Admin actions keyed by listing (a seeded live listing may have no verification request yet). */
export const adminProperties = new Hono<AppEnv>()
  .use(requireUser("admin"))

  /** setVerificationStage: moves the pipeline, records the note, tells the landlord, and matches waiting lists on publish. */
  .post("/:id/stage", async (c) => {
    const { db, now } = c.get("deps");
    const admin = c.get("user");
    const input = await body(c, stageSchema);
    const property = await db.property.findUnique({ where: { id: c.req.param("id") } });
    if (!property) throw ApiError.notFound("Property");
    const current = property.verification;
    if (!ADMIN_TRANSITIONS[current].includes(input.stage)) {
      throw ApiError.rule("invalid_transition", `A listing can't move from ${current} to ${input.stage}.`, { from: current, allowed: ADMIN_TRANSITIONS[current] });
    }
    const at = now();
    const result = await db.$transaction(async (tx) => {
      const vr = await tx.verificationRequest.upsert({
        where: { propertyId: property.id },
        create: {
          propertyId: property.id,
          stage: input.stage,
          submittedAt: at,
          checklist: { create: DEFAULT_CHECKLIST.map((item, position) => ({ key: item.id, label: item.label, description: item.description, position })) },
        },
        update: { stage: input.stage },
      });
      if (input.inspector || input.inspectionDate) {
        await tx.verificationRequest.update({
          where: { id: vr.id },
          data: { inspector: input.inspector, inspectionDate: input.inspectionDate ? new Date(input.inspectionDate) : undefined },
        });
      }
      if (input.note) await tx.verificationNote.create({ data: { requestId: vr.id, authorName: admin.name, body: input.note, createdAt: at } });
      const updated = await tx.property.update({
        where: { id: property.id },
        data: { verification: input.stage, ...(input.stage === "verified" || input.stage === "published" ? { verifiedAt: at } : {}) },
        include: propertyInclude,
      });
      const label = LANDLORD_LABELS[input.stage];
      if (label) {
        await notify(tx, at, [
          [
            property.landlordId,
            {
              title: label,
              body: input.note ? `${property.title}: ${input.note}` : `${property.title} moved to "${label}".`,
              kind: "verification",
              href: "/landlord/properties",
            },
          ],
        ]);
      }
      // Tell waiting-list tenants when a listing first becomes visible to them (verified or published).
      const goesLive = PUBLIC.includes(input.stage) && !PUBLIC.includes(current);
      const matched = goesLive ? await notifyWaitingListMatches(tx, at, toProperty(updated)) : 0;
      return { property: toProperty(updated), verification: toVerification(await tx.verificationRequest.findUniqueOrThrow({ where: { id: vr.id }, include: verificationInclude })), matched };
    });
    return c.json(result);
  })

  /** Curate the home page's featured listings. */
  .patch("/:id", async (c) => {
    const { db } = c.get("deps");
    const { featured } = await body(c, z.object({ featured: z.boolean() }));
    const row = await db.property.update({ where: { id: c.req.param("id") }, data: { featured }, include: propertyInclude });
    return c.json({ property: toProperty(row) });
  });
