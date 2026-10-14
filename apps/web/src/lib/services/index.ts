/**
 * Data access layer.
 *
 * Every page reads data through these async functions instead of importing
 * mock arrays directly. Today they resolve from in-memory mock data; when the
 * Supabase backend lands, each function body is swapped for a query, e.g.
 *
 *   const { data } = await supabase.from("properties").select("*").eq("id", id).single();
 *
 * and no page or component needs to change.
 */
import type { Property, SearchFilters } from "@/types";
import { PROPERTIES, isPublic } from "renton-core/mock/properties";
import { LANDLORDS, TENANTS, ALL_USERS } from "renton-core/mock/users";
import { CITIES, citySlug } from "renton-shared/reference";
import { filterProperties } from "@/lib/search";

export const DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";

export async function getPublicProperties(filters: SearchFilters = {}): Promise<Property[]> {
  return filterProperties(PROPERTIES.filter(isPublic), filters);
}

export async function getFeaturedProperties(limit = 8): Promise<Property[]> {
  return PROPERTIES.filter((p) => isPublic(p) && p.featured).slice(0, limit);
}

export async function getPropertyById(id: string): Promise<Property | null> {
  return PROPERTIES.find((p) => p.id === id) ?? null;
}

export async function getSimilarProperties(p: Property, limit = 3): Promise<Property[]> {
  return PROPERTIES.filter((x) => isPublic(x) && x.id !== p.id && (x.city === p.city || x.type === p.type))
    .sort((a, b) => Number(b.city === p.city) - Number(a.city === p.city) || Math.abs(a.rent - p.rent) - Math.abs(b.rent - p.rent))
    .slice(0, limit);
}

export async function getLandlord(id: string) {
  return LANDLORDS.find((l) => l.id === id) ?? null;
}

export async function getTenant(id: string) {
  return TENANTS.find((t) => t.id === id) ?? null;
}

export async function getUser(id: string) {
  return ALL_USERS.find((u) => u.id === id) ?? null;
}

export async function getCityStats() {
  return CITIES.map((c) => ({
    ...c,
    slug: citySlug(c.name),
    listings: PROPERTIES.filter((p) => isPublic(p) && p.city === c.name).length,
  }));
}

export async function getCityBySlug(slug: string) {
  const city = CITIES.find((c) => citySlug(c.name) === slug);
  if (!city) return null;
  const properties = await getPublicProperties({ city: city.name });
  return { ...city, slug, properties };
}

export function getAllCitySlugs() {
  return CITIES.map((c) => citySlug(c.name));
}

/** All seeded listings (including those mid-verification) get a page; unknown IDs 404. */
export function getAllPropertyIds() {
  return PROPERTIES.map((p) => p.id);
}


