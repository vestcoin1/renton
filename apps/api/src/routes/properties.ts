import type { Prisma } from "@prisma/client";
import { Hono } from "hono";
import { filtersFromParams } from "renton-core/search";
import { CITIES, citySlug } from "renton-shared/reference";
import { z } from "zod";
import { findProfile } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";
import { ApiError } from "../lib/errors.js";
import { query } from "../lib/validate.js";
import { profileInclude, propertyInclude, toProperty, toUser } from "../mappers.js";

export const PUBLIC_STAGES = ["published", "verified"] as const;
const isPublic = { verification: { in: [...PUBLIC_STAGES] } } satisfies Prisma.PropertyWhereInput;

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

/**
 * Search uses the same query parameters as the web app's URLs (renton-core/search `filtersToParams`):
 * q, state, city, area, type, beds, baths, min, max, furnished, parking, water, security, sort.
 * Results match `filterProperties` exactly; the filtering just runs in Postgres.
 */
function searchWhere(params: URLSearchParams): { where: Prisma.PropertyWhereInput; orderBy: Prisma.PropertyOrderByWithRelationInput[] } {
  const f = filtersFromParams(params);
  const q = f.q?.trim();
  const where: Prisma.PropertyWhereInput = {
    ...isPublic,
    state: f.state || undefined,
    city: f.city || undefined,
    area: f.area || undefined,
    type: f.type && f.type !== "Any" ? f.type : undefined,
    bedrooms: f.bedrooms ? { gte: f.bedrooms } : undefined,
    bathrooms: f.bathrooms ? { gte: f.bathrooms } : undefined,
    rent: f.minBudget != null || f.maxBudget != null ? { gte: f.minBudget, lte: f.maxBudget } : undefined,
    furnished: f.furnished ? true : undefined,
    parkingSpaces: f.parking ? { gte: 1 } : undefined,
    waterSupply: f.water ? { startsWith: "Borehole" } : undefined,
    security: f.security ? true : undefined,
    ...(q ? { OR: (["title", "area", "city", "address", "type"] as const).map((k) => ({ [k]: { contains: q, mode: "insensitive" } })) } : {}),
  };
  const orderBy: Prisma.PropertyOrderByWithRelationInput[] =
    f.sort === "price-asc"
      ? [{ rent: "asc" }]
      : f.sort === "price-desc"
        ? [{ rent: "desc" }]
        : f.sort === "newest"
          ? [{ listedAt: "desc" }]
          : [{ featured: "desc" }, { views: "desc" }];
  return { where, orderBy: [...orderBy, { id: "asc" }] };
}

export const properties = new Hono<AppEnv>()
  .get("/", async (c) => {
    const { db } = c.get("deps");
    const { page, pageSize } = query(c, pageSchema.passthrough());
    const { where, orderBy } = searchWhere(new URL(c.req.url).searchParams);
    const [rows, total] = await Promise.all([
      db.property.findMany({ where, orderBy, include: propertyInclude, skip: (page - 1) * pageSize, take: pageSize }),
      db.property.count({ where }),
    ]);
    return c.json({ items: rows.map(toProperty), total, page, pageSize });
  })

  .get("/featured", async (c) => {
    const { db } = c.get("deps");
    const { limit } = query(c, z.object({ limit: z.coerce.number().int().min(1).max(24).default(8) }));
    const rows = await db.property.findMany({ where: { ...isPublic, featured: true }, orderBy: [{ views: "desc" }, { id: "asc" }], take: limit, include: propertyInclude });
    return c.json({ items: rows.map(toProperty) });
  })

  /** A listing and its landlord's public profile. Unpublished listings are visible only to their landlord and admins. */
  .get("/:id", async (c) => {
    const { db } = c.get("deps");
    const row = await db.property.findUnique({ where: { id: c.req.param("id") }, include: propertyInclude });
    if (!row) throw ApiError.notFound("Property");
    if (!(PUBLIC_STAGES as readonly string[]).includes(row.verification)) {
      const auth = c.get("auth");
      const viewer = auth ? await findProfile(db, auth) : null;
      if (!viewer || (viewer.role !== "admin" && viewer.id !== row.landlordId)) throw ApiError.notFound("Property");
    }
    const landlord = await db.profile.findUniqueOrThrow({ where: { id: row.landlordId }, include: profileInclude });
    return c.json({ property: toProperty(row), landlord: toUser(landlord, { withContact: false }) });
  })

  /** Same city or same type, nearest in price first (as getSimilarProperties). */
  .get("/:id/similar", async (c) => {
    const { db } = c.get("deps");
    const { limit } = query(c, z.object({ limit: z.coerce.number().int().min(1).max(12).default(3) }));
    const p = await db.property.findUnique({ where: { id: c.req.param("id") } });
    if (!p) throw ApiError.notFound("Property");
    const rows = await db.property.findMany({ where: { ...isPublic, id: { not: p.id }, OR: [{ city: p.city }, { type: p.type }] }, include: propertyInclude });
    const items = rows
      .sort((a, b) => Number(b.city === p.city) - Number(a.city === p.city) || Math.abs(a.rent - p.rent) - Math.abs(b.rent - p.rent))
      .slice(0, limit)
      .map(toProperty);
    return c.json({ items });
  });

export const cities = new Hono<AppEnv>().get("/", async (c) => {
  const { db } = c.get("deps");
  const counts = await db.property.groupBy({ by: ["city"], where: isPublic, _count: { _all: true } });
  const byCity = new Map(counts.map((r) => [r.city, r._count._all]));
  return c.json({ items: CITIES.map((city) => ({ ...city, slug: citySlug(city.name), listings: byCity.get(city.name) ?? 0 })) });
});

/** A landlord's public profile and live listings (no contact details). */
export const landlords = new Hono<AppEnv>().get("/:id", async (c) => {
  const { db } = c.get("deps");
  const row = await db.profile.findUnique({ where: { id: c.req.param("id") }, include: profileInclude });
  if (!row || row.role !== "landlord") throw ApiError.notFound("Landlord");
  const listings = await db.property.findMany({ where: { ...isPublic, landlordId: row.id }, include: propertyInclude, orderBy: { listedAt: "desc" } });
  return c.json({ landlord: toUser(row, { withContact: false }), properties: listings.map(toProperty) });
});
