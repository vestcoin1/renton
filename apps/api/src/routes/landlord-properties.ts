import { Hono } from "hono";
import { DEFAULT_CHECKLIST } from "renton-core/mock/records";
import { CITIES, PROPERTY_TYPES, stateForCity } from "renton-shared/reference";
import type { VerificationStage } from "renton-shared/types";
import { z } from "zod";
import { assertIdentitySubmitted, requireUser } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";
import { ApiError } from "../lib/errors.js";
import { assertOwnFile, parseStorageRef, viewUrl } from "../lib/storage.js";
import { body, isoDate, naira } from "../lib/validate.js";
import { propertyInclude, toProperty, toVerification, verificationInclude } from "../mappers.js";
import { ADMINS, notify, type Db } from "../services/notifications.js";

const WATER = ["Borehole", "Public Mains", "Borehole + Treatment"] as const;
const POWER = ["Prepaid Meter", "Prepaid + Inverter", "Prepaid + Generator", "24/7 Estate Power"] as const;
const DOC_KINDS = ["C of O", "Deed of Assignment", "Survey Plan", "Governor's Consent", "Building Approval", "Owner ID", "Utility Bill", "Power of Attorney"] as const;
const count = (max: number) => z.number().int().min(0).max(max);

const documentSchema = z.object({ name: z.string().trim().min(1).max(200), kind: z.enum(DOC_KINDS), sizeKb: z.number().int().min(0).max(51_200), url: z.string().min(1) });

const listingFields = {
  title: z.string().trim().min(5).max(120),
  type: z.enum(PROPERTY_TYPES as [string, ...string[]]),
  description: z.string().trim().min(20).max(5000),
  city: z.string().refine((c) => CITIES.some((x) => x.name === c), "We don't cover this city yet."),
  area: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(200),
  rent: naira.min(1),
  serviceCharge: naira,
  cautionDeposit: naira,
  bedrooms: count(20),
  bathrooms: count(20),
  toilets: count(30),
  sizeSqm: count(100_000),
  furnished: z.boolean(),
  parkingSpaces: count(50),
  waterSupply: z.enum(WATER),
  power: z.enum(POWER),
  security: z.boolean(),
  amenities: z.array(z.string().trim().min(1).max(60)).max(40),
  images: z.array(z.string().min(1)).min(1).max(20),
  availableFrom: isoDate,
};

const createSchema = z.object({ ...listingFields, documents: z.array(documentSchema).max(10).default([]) });
const updateSchema = z.object(listingFields).partial();

/** Images in the public bucket are stored as their public URL, so listings render without signing. */
async function imageUrls(c: { get: (k: "deps") => AppEnv["Variables"]["deps"] }, landlordId: string, images: string[]) {
  const { storage } = c.get("deps");
  return Promise.all(
    images.map(async (url) => {
      assertOwnFile(storage, "property_image", landlordId, url);
      return parseStorageRef(url) ? viewUrl(storage, url) : url;
    }),
  );
}

async function ownProperty(db: Db, landlordId: string, id: string) {
  const row = await db.property.findUnique({ where: { id }, include: propertyInclude });
  if (!row || row.landlordId !== landlordId) throw ApiError.notFound("Property");
  return row;
}

/** Moves a draft or changes-requested listing (back) into the admin queue. */
async function submitForReview(db: Db, now: Date, propertyId: string, title: string, where: string) {
  const vr = await db.verificationRequest.upsert({
    where: { propertyId },
    create: {
      propertyId,
      stage: "submitted",
      submittedAt: now,
      checklist: { create: DEFAULT_CHECKLIST.map((c, position) => ({ key: c.id, label: c.label, description: c.description, position })) },
    },
    update: { stage: "submitted", submittedAt: now },
  });
  await db.property.update({ where: { id: propertyId }, data: { verification: "submitted" } });
  await notify(db, now, [[ADMINS, { title: "New verification submission", body: `${title} in ${where}.`, kind: "verification", href: `/admin/verifications/${vr.id}` }]]);
  return vr;
}

const EDITABLE: VerificationStage[] = ["draft", "changes_requested"];

export const landlordProperties = new Hono<AppEnv>()
  .use(requireUser("landlord"))

  .get("/", async (c) => {
    const { db } = c.get("deps");
    const rows = await db.property.findMany({ where: { landlordId: c.get("user").id }, include: propertyInclude, orderBy: { listedAt: "desc" } });
    return c.json({ items: rows.map(toProperty) });
  })

  /** New listing → straight into the verification queue (as addProperty). */
  .post("/", async (c) => {
    const { db, storage, now } = c.get("deps");
    const user = c.get("user");
    assertIdentitySubmitted(user);
    const input = await body(c, createSchema);
    const images = await imageUrls(c, user.id, input.images);
    for (const d of input.documents) assertOwnFile(storage, "verification_document", user.id, d.url);
    const at = now();

    const property = await db.$transaction(async (tx) => {
      const { documents, images: _images, availableFrom, ...fields } = input;
      const created = await tx.property.create({
        data: {
          ...fields,
          state: stateForCity(input.city)!,
          landlordId: user.id,
          verification: "submitted",
          occupancy: "vacant",
          availableFrom: new Date(availableFrom),
          listedAt: at,
          nearby: [],
          images: { create: images.map((url, position) => ({ url, position })) },
        },
      });
      const vr = await submitForReview(tx, at, created.id, created.title, `${created.area}, ${created.city}`);
      if (documents.length) {
        await tx.verificationDocument.createMany({ data: documents.map((d) => ({ requestId: vr.id, name: d.name, kind: d.kind, sizeKb: d.sizeKb, url: d.url, uploadedAt: at })) });
      }
      return tx.property.findUniqueOrThrow({ where: { id: created.id }, include: propertyInclude });
    });
    return c.json({ property: toProperty(property) }, 201);
  })

  /** Listing details can change while it's a draft or after the team requests changes; then resubmit. */
  .patch("/:id", async (c) => {
    const { db, now } = c.get("deps");
    const user = c.get("user");
    const row = await ownProperty(db, user.id, c.req.param("id"));
    if (!EDITABLE.includes(row.verification)) {
      throw ApiError.conflict("Listings can only be edited as a draft or when changes are requested.", "listing_locked");
    }
    const input = await body(c, updateSchema);
    const images = input.images ? await imageUrls(c, user.id, input.images) : undefined;
    const { images: _i, availableFrom, ...fields } = input;
    const updated = await db.$transaction(async (tx) => {
      if (images) {
        await tx.propertyImage.deleteMany({ where: { propertyId: row.id } });
        await tx.propertyImage.createMany({ data: images.map((url, position) => ({ propertyId: row.id, url, position })) });
      }
      return tx.property.update({
        where: { id: row.id },
        data: { ...fields, ...(fields.city ? { state: stateForCity(fields.city)! } : {}), ...(availableFrom ? { availableFrom: new Date(availableFrom) } : {}), updatedAt: now() },
        include: propertyInclude,
      });
    });
    return c.json({ property: toProperty(updated) });
  })

  .post("/:id/submit", async (c) => {
    const { db, now } = c.get("deps");
    const user = c.get("user");
    const row = await ownProperty(db, user.id, c.req.param("id"));
    if (!EDITABLE.includes(row.verification)) throw ApiError.conflict("This listing is already in review or decided.", "invalid_stage");
    await db.$transaction((tx) => submitForReview(tx, now(), row.id, row.title, `${row.area}, ${row.city}`));
    return c.json({ property: toProperty(await ownProperty(db, user.id, row.id)) });
  })

  .patch("/:id/occupancy", async (c) => {
    const { db } = c.get("deps");
    const user = c.get("user");
    const input = await body(c, z.object({ occupancy: z.enum(["vacant", "occupied", "available_soon"]), availableFrom: isoDate.optional() }));
    const row = await ownProperty(db, user.id, c.req.param("id"));
    const updated = await db.property.update({
      where: { id: row.id },
      data: { occupancy: input.occupancy, ...(input.availableFrom ? { availableFrom: new Date(input.availableFrom) } : {}) },
      include: propertyInclude,
    });
    return c.json({ property: toProperty(updated) });
  })

  /** The listing's verification progress. Internal team notes are not shared with the landlord. */
  .get("/:id/verification", async (c) => {
    const { db } = c.get("deps");
    const row = await ownProperty(db, c.get("user").id, c.req.param("id"));
    const vr = await db.verificationRequest.findUnique({ where: { propertyId: row.id }, include: verificationInclude });
    return c.json({ verification: vr ? { ...toVerification(vr), notes: [] } : null });
  })

  /** Adds an ownership document (C of O, deed…) to the listing's verification file. */
  .post("/:id/documents", async (c) => {
    const { db, storage, now } = c.get("deps");
    const user = c.get("user");
    const row = await ownProperty(db, user.id, c.req.param("id"));
    const doc = await body(c, documentSchema);
    assertOwnFile(storage, "verification_document", user.id, doc.url);
    const vr = await db.verificationRequest.findUnique({ where: { propertyId: row.id } });
    if (!vr || vr.stage === "published" || vr.stage === "rejected") throw ApiError.conflict("This listing isn't open for documents.", "invalid_stage");
    await db.verificationDocument.create({ data: { requestId: vr.id, name: doc.name, kind: doc.kind, sizeKb: doc.sizeKb, url: doc.url, uploadedAt: now() } });
    const full = await db.verificationRequest.findUniqueOrThrow({ where: { id: vr.id }, include: verificationInclude });
    return c.json({ verification: { ...toVerification(full), notes: [] } }, 201);
  });
