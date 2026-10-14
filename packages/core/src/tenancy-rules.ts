import type { Lease, LeaseIntent, RentContribution, RentPlan } from "renton-shared/types";

/** A rent increase must be served at least this many days before the tenancy expires (3 months). */
export const RENT_NOTICE_DAYS = 90;

/** A caution deposit is refundable this many days after the tenant gives move-out notice. */
export const REFUND_WAIT_DAYS = 30;

const DAY = 86_400_000;

export const daysUntil = (iso: string, now = Date.now()) => Math.floor((new Date(iso).getTime() - now) / DAY);

/** Tenants whose lease hasn't started yet: they pay the full rent and cannot negotiate. */
export const hasMovedIn = (lease: Pick<Lease, "leaseStart">, now = Date.now()) => new Date(lease.leaseStart).getTime() <= now;

export type NoticeCheck = { ok: true; daysLeft: number } | { ok: false; daysLeft: number; reason: string };

/** Whether a rent-increase notice can still be served on this lease. */
export function canServeRentNotice(lease: Pick<Lease, "leaseEnd" | "status">, now = Date.now()): NoticeCheck {
  const daysLeft = daysUntil(lease.leaseEnd, now);
  if (lease.status === "ended") return { ok: false, daysLeft, reason: "Tenancy has ended" };
  if (daysLeft < RENT_NOTICE_DAYS) {
    return { ok: false, daysLeft, reason: daysLeft < 0 ? "Tenancy already expired" : `Only ${daysLeft} days left; needs at least 3 months' notice` };
  }
  return { ok: true, daysLeft };
}

export function refundEligibleFrom(intent: Pick<LeaseIntent, "submittedAt">) {
  return new Date(new Date(intent.submittedAt).getTime() + REFUND_WAIT_DAYS * DAY).toISOString();
}

export const isRefundEligible = (eligibleFrom: string, now = Date.now()) => new Date(eligibleFrom).getTime() <= now;

/** Rent for the next term: the agreed rent from a rent review, otherwise the current rent. */
export const nextTermRent = (lease: Pick<Lease, "annualRent" | "rentReview">) =>
  lease.rentReview?.status === "agreed" && lease.rentReview.agreedRent ? lease.rentReview.agreedRent : lease.annualRent;

/** Smallest installment renton accepts, so tiny transfers don't flood verification. */
export const MIN_INSTALLMENT = 5_000;

export interface RentPlanProgress {
  target: number;
  /** Verified by renton. */
  saved: number;
  /** Receipts uploaded but not yet verified. */
  pending: number;
  remaining: number;
  /** Most the tenant can still send without overpaying (remaining minus pending). */
  maxNext: number;
  funded: boolean;
  pct: number;
  monthsLeft: number;
  /** Suggested monthly amount to be fully funded by the due date. */
  monthly: number;
}

export function rentPlanProgress(plan: Pick<RentPlan, "contributions" | "dueDate" | "payout">, lease: Pick<Lease, "annualRent" | "rentReview">, now = Date.now()): RentPlanProgress {
  const target = plan.payout?.amount ?? nextTermRent(lease);
  const sum = (st: RentContribution["status"]) => plan.contributions.filter((c) => c.status === st).reduce((n, c) => n + c.amount, 0);
  const saved = sum("verified");
  const pending = sum("submitted");
  const remaining = Math.max(0, target - saved);
  const monthsLeft = Math.max(1, Math.ceil(daysUntil(plan.dueDate, now) / 30.4));
  return {
    target,
    saved,
    pending,
    remaining,
    maxNext: Math.max(0, remaining - pending),
    funded: saved >= target,
    pct: target ? Math.min(100, (saved / target) * 100) : 0,
    monthsLeft,
    monthly: Math.ceil(Math.max(0, remaining - pending) / monthsLeft / 1000) * 1000,
  };
}

/**
 * The plan to show for a lease: the one still saving, or the one already paid out
 * for the current term. After a renewal moves `leaseEnd`, a fresh plan can start.
 */
export const currentRentPlan = (plans: RentPlan[], lease: Pick<Lease, "id" | "leaseEnd">) =>
  plans.find((p) => p.leaseId === lease.id && p.status === "saving") ??
  plans.find((p) => p.leaseId === lease.id && p.status === "paid_out" && p.dueDate === lease.leaseEnd);


