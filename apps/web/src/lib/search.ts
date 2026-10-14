import type { Property, PropertyType, SearchFilters } from "@/types";

export function filterProperties(list: Property[], f: SearchFilters): Property[] {
  const q = f.q?.trim().toLowerCase();
  const out = list.filter((p) => {
    if (q && ![p.title, p.area, p.city, p.address, p.type].some((s) => s.toLowerCase().includes(q))) return false;
    if (f.state && p.state !== f.state) return false;
    if (f.city && p.city !== f.city) return false;
    if (f.area && p.area !== f.area) return false;
    if (f.type && f.type !== "Any" && p.type !== f.type) return false;
    if (f.bedrooms && p.bedrooms < f.bedrooms) return false;
    if (f.bathrooms && p.bathrooms < f.bathrooms) return false;
    if (f.minBudget != null && p.rent < f.minBudget) return false;
    if (f.maxBudget != null && p.rent > f.maxBudget) return false;
    if (f.furnished && !p.furnished) return false;
    if (f.parking && p.parkingSpaces < 1) return false;
    if (f.water && !p.waterSupply.startsWith("Borehole")) return false;
    if (f.security && !p.security) return false;
    return true;
  });

  switch (f.sort) {
    case "price-asc":
      return out.sort((a, b) => a.rent - b.rent);
    case "price-desc":
      return out.sort((a, b) => b.rent - a.rent);
    case "newest":
      return out.sort((a, b) => +new Date(b.listedAt) - +new Date(a.listedAt));
    default:
      return out.sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || b.views - a.views);
  }
}

const num = (v: string | null) => (v != null && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : undefined);
const bool = (v: string | null) => (v === "1" ? true : undefined);

export function filtersFromParams(sp: URLSearchParams): SearchFilters {
  return {
    q: sp.get("q") ?? undefined,
    state: sp.get("state") ?? undefined,
    city: sp.get("city") ?? undefined,
    area: sp.get("area") ?? undefined,
    type: (sp.get("type") as PropertyType | null) ?? undefined,
    bedrooms: num(sp.get("beds")),
    bathrooms: num(sp.get("baths")),
    minBudget: num(sp.get("min")),
    maxBudget: num(sp.get("max")),
    furnished: bool(sp.get("furnished")),
    parking: bool(sp.get("parking")),
    water: bool(sp.get("water")),
    security: bool(sp.get("security")),
    sort: (sp.get("sort") as SearchFilters["sort"]) ?? undefined,
  };
}

export function filtersToParams(f: SearchFilters) {
  const sp = new URLSearchParams();
  const set = (k: string, v: unknown) => {
    if (v === undefined || v === null || v === "" || v === false || v === "Any") return;
    sp.set(k, v === true ? "1" : String(v));
  };
  set("q", f.q);
  set("state", f.state);
  set("city", f.city);
  set("area", f.area);
  set("type", f.type);
  set("beds", f.bedrooms);
  set("baths", f.bathrooms);
  set("min", f.minBudget);
  set("max", f.maxBudget);
  set("furnished", f.furnished);
  set("parking", f.parking);
  set("water", f.water);
  set("security", f.security);
  if (f.sort && f.sort !== "recommended") set("sort", f.sort);
  return sp;
}

export function activeFilterCount(f: SearchFilters) {
  return [
    f.state,
    f.city,
    f.area,
    f.type && f.type !== "Any" ? f.type : undefined,
    f.bedrooms,
    f.bathrooms,
    f.minBudget,
    f.maxBudget,
    f.furnished,
    f.parking,
    f.water,
    f.security,
  ].filter((v) => v !== undefined && v !== null && v !== "").length;
}
