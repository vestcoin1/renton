import { Hono } from "hono";
import { topMatches } from "renton-core/matching";
import { CITIES, PROPERTY_TYPES } from "renton-shared/reference";
import { z } from "zod";
import { requireUser } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";
import { ApiError } from "../lib/errors.js";
import { body, naira, query } from "../lib/validate.js";
import { propertyInclude, toProperty, toWaitingList } from "../mappers.js";

const createSchema = z
  .object({
    city: z.string().refine((c) => CITIES.some((x) => x.name === c), "We don't cover this city yet."),
    areas: z.array(z.string().trim().min(1).max(80)).max(10),
    propertyType: z.enum(["Any", ...PROPERTY_TYPES] as [string, ...string[]]),
    bedrooms: z.number().int().min(0).max(10),
    minBudget: naira,
    maxBudget: naira.min(1),
    moveIn: z.enum(["Immediately", "Within 1 month", "1-3 months", "Flexible"]),
  })
  .refine((w) => w.minBudget <= w.maxBudget, { message: "Minimum budget can't exceed the maximum.", path: ["minBudget"] });

export const waitingLists = new Hono<AppEnv>()
  .use(requireUser("tenant"))

  .get("/", async (c) => {
    const { db } = c.get("deps");
    const rows = await db.waitingList.findMany({ where: { tenantId: c.get("user").id }, orderBy: { createdAt: "desc" } });
    return c.json({ items: rows.map(toWaitingList) });
  })

  .post("/", async (c) => {
    const { db, now } = c.get("deps");
    const input = await body(c, createSchema);
    const row = await db.waitingList.create({ data: { ...input, tenantId: c.get("user").id, status: "active", createdAt: now() } });
    return c.json({ waitingList: toWaitingList(row) }, 201);
  })

  .patch("/:id", async (c) => {
    const { db } = c.get("deps");
    const { status } = await body(c, z.object({ status: z.enum(["active", "paused", "matched"]) }));
    const { count } = await db.waitingList.updateMany({ where: { id: c.req.param("id"), tenantId: c.get("user").id }, data: { status } });
    if (count === 0) throw ApiError.notFound("Waiting list");
    return c.json({ waitingList: toWaitingList(await db.waitingList.findUniqueOrThrow({ where: { id: c.req.param("id") } })) });
  })

  .delete("/:id", async (c) => {
    const { db } = c.get("deps");
    const { count } = await db.waitingList.deleteMany({ where: { id: c.req.param("id"), tenantId: c.get("user").id } });
    if (count === 0) throw ApiError.notFound("Waiting list");
    return c.json({ ok: true });
  })

  /** Best live listings for one waiting list, scored with renton-core/matching (score ≥ 50, best first). */
  .get("/:id/matches", async (c) => {
    const { db } = c.get("deps");
    const { limit } = query(c, z.object({ limit: z.coerce.number().int().min(1).max(24).default(6) }));
    const row = await db.waitingList.findFirst({ where: { id: c.req.param("id"), tenantId: c.get("user").id } });
    if (!row) throw ApiError.notFound("Waiting list");
    const candidates = await db.property.findMany({ where: { city: row.city, verification: { in: ["published", "verified"] } }, include: propertyInclude });
    const matches = topMatches(toWaitingList(row), candidates.map(toProperty), limit);
    return c.json({ items: matches });
  });

export const saved = new Hono<AppEnv>()
  .use(requireUser())

  .get("/", async (c) => {
    const { db } = c.get("deps");
    const rows = await db.savedProperty.findMany({
      where: { profileId: c.get("user").id, property: { verification: { in: ["published", "verified"] } } },
      include: { property: { include: propertyInclude } },
      orderBy: { createdAt: "desc" },
    });
    return c.json({ items: rows.map((r) => toProperty(r.property)) });
  })

  .put("/:propertyId", async (c) => {
    const { db, now } = c.get("deps");
    const profileId = c.get("user").id;
    const propertyId = c.req.param("propertyId");
    const property = await db.property.findUnique({ where: { id: propertyId }, select: { verification: true } });
    if (!property || !["published", "verified"].includes(property.verification)) throw ApiError.notFound("Property");
    await db.savedProperty.upsert({ where: { profileId_propertyId: { profileId, propertyId } }, create: { profileId, propertyId, createdAt: now() }, update: {} });
    return c.json({ saved: true });
  })

  .delete("/:propertyId", async (c) => {
    const { db } = c.get("deps");
    await db.savedProperty.deleteMany({ where: { profileId: c.get("user").id, propertyId: c.req.param("propertyId") } });
    return c.json({ saved: false });
  });
