import type { Lease, RentPlan } from "renton-shared/types";
import { ApiError } from "../lib/errors.js";
import { leaseInclude, rentPlanInclude, toLease, toRentPlan } from "../mappers.js";
import type { Db } from "./notifications.js";

/** A lease as both its row (for ids/relations) and its domain shape (for renton-core/tenancy-rules). */
export async function loadLease(db: Db, id: string) {
  const row = await db.lease.findUnique({ where: { id }, include: { ...leaseInclude, property: true, tenant: { select: { id: true, name: true } } } });
  if (!row) throw ApiError.notFound("Lease");
  return { row, lease: toLease(row) as Lease };
}

export async function loadRentPlan(db: Db, id: string) {
  const row = await db.rentPlan.findUnique({ where: { id }, include: rentPlanInclude });
  if (!row) throw ApiError.notFound("Rent plan");
  return { row, plan: toRentPlan(row) as RentPlan };
}

/**
 * Applies a status change only if the record is still in the expected state, so two admins
 * clicking at once can't both verify a payment or pay out a plan twice.
 */
export function assertTransition(count: number, message = "This was already updated by someone else. Refresh and try again.") {
  if (count === 0) throw ApiError.conflict(message, "stale_state");
}

/** Adds whole years to a calendar date (lease terms), in UTC. */
export function addYears(d: Date, years: number) {
  const next = new Date(d);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}
