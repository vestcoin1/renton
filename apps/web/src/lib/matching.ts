import type { MatchResult, Property, WaitingList } from "@/types";

export type MatchPrefs = Pick<WaitingList, "city" | "areas" | "propertyType" | "bedrooms" | "minBudget" | "maxBudget">;

/**
 * Scores how well a property fits a tenant's waiting-list preferences (0–100).
 * Weights: area 30, budget 30, type 15, bedrooms 15, availability 10.
 * Kept pure so it can later run as a Postgres function / edge function.
 */
export function scoreMatch(prefs: MatchPrefs, p: Property): MatchResult {
  let score = 0;

  const inArea = prefs.areas.length ? prefs.areas.includes(p.area) && p.city === prefs.city : p.city === prefs.city;
  if (inArea) score += 30;
  else if (p.city === prefs.city) score += 14;

  const withinBudget = p.rent <= prefs.maxBudget && p.rent >= prefs.minBudget * 0.8;
  if (withinBudget) score += 30;
  else if (p.rent <= prefs.maxBudget * 1.1) score += 16;
  else if (p.rent <= prefs.maxBudget * 1.25) score += 6;

  const typeOk = prefs.propertyType === "Any" || prefs.propertyType === p.type;
  if (typeOk) score += 15;
  else if (["Apartment", "Mini Flat"].includes(prefs.propertyType) && ["Apartment", "Mini Flat"].includes(p.type)) score += 7;

  const bedsOk = p.bedrooms >= prefs.bedrooms;
  if (bedsOk) score += p.bedrooms - prefs.bedrooms > 2 ? 9 : 15;
  else if (p.bedrooms === prefs.bedrooms - 1) score += 5;

  const immediate = p.occupancy === "vacant";
  if (immediate) score += 10;
  else if (p.occupancy === "available_soon") score += 6;

  return {
    score: Math.min(100, Math.round(score)),
    reasons: [
      { label: inArea ? "Preferred area" : "Outside preferred area", met: inArea },
      { label: withinBudget ? "Within budget" : "Slightly above budget", met: withinBudget },
      {
        label: typeOk ? `Matches ${prefs.propertyType === "Any" ? "property type" : prefs.propertyType.toLowerCase()}` : "Different property type",
        met: typeOk,
      },
      { label: bedsOk ? `${p.bedrooms}+ bedrooms` : "Fewer bedrooms than requested", met: bedsOk },
      { label: immediate ? "Available immediately" : p.occupancy === "available_soon" ? "Available soon" : "Currently occupied", met: immediate },
    ],
  };
}

export function topMatches(prefs: MatchPrefs, properties: Property[], limit = 6) {
  return properties
    .map((p) => ({ property: p, match: scoreMatch(prefs, p) }))
    .filter((m) => m.match.score >= 50)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);
}

export function scoreTone(score: number) {
  if (score >= 85) return { label: "Excellent match", className: "text-emerald-600 dark:text-emerald-400", ring: "stroke-success" };
  if (score >= 70) return { label: "Strong match", className: "text-primary", ring: "stroke-primary" };
  return { label: "Partial match", className: "text-amber-600 dark:text-amber-400", ring: "stroke-amber-500" };
}
