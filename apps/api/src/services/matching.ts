import { scoreMatch } from "renton-core/matching";
import type { Property } from "renton-shared/types";
import { toWaitingList } from "../mappers.js";
import { notify, type Db } from "./notifications.js";

/** Tenants are told about a listing that scores at least this well against one of their active waiting lists. */
export const MATCH_NOTIFY_MIN_SCORE = 80;

/**
 * Runs when a listing goes live or becomes available again: scores it against every active waiting
 * list in the city (renton-core/matching, the same function the web app renders) and notifies each
 * tenant once, for their best-scoring list. Returns the number of tenants notified.
 */
export async function notifyWaitingListMatches(db: Db, now: Date, property: Property) {
  if (property.occupancy === "occupied") return 0;
  const lists = await db.waitingList.findMany({ where: { status: "active", city: property.city, tenantId: { not: property.landlordId } } });
  const best = new Map<string, number>();
  for (const w of lists) {
    const { score } = scoreMatch(toWaitingList(w), property);
    if (score >= MATCH_NOTIFY_MIN_SCORE && score > (best.get(w.tenantId) ?? 0)) best.set(w.tenantId, score);
  }
  await notify(
    db,
    now,
    [...best].map(([tenantId, score]) => [
      tenantId,
      {
        title: `New ${score}% match in ${property.area}`,
        body: `A verified ${property.bedrooms}-bedroom ${property.type.toLowerCase()} fits your waiting list.`,
        kind: "match",
        href: `/properties/${property.id}`,
      },
    ]),
  );
  return best.size;
}
