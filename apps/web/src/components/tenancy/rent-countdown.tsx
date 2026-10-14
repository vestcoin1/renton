"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import type { Lease } from "@/types";
import { cn, formatDate, formatNaira } from "renton-core/utils";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function splitDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

/** Urgency tone used across the countdown UI. */
export function dueTone(days: number) {
  if (days <= 14) return { ring: "stroke-destructive", text: "text-destructive", chip: "bg-destructive/10 text-destructive", label: "Due very soon" };
  if (days <= 60) return { ring: "stroke-amber-500", text: "text-amber-600 dark:text-amber-400", chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300", label: "Coming up" };
  return { ring: "stroke-success", text: "text-emerald-600 dark:text-emerald-400", chip: "bg-success/10 text-emerald-700 dark:text-emerald-300", label: "On track" };
}

/**
 * Annual rent in Nigeria is paid upfront, so the next payment falls due when the
 * current term ends. Counts down live to that date.
 */
export function RentCountdown({ lease, variant = "full", className }: { lease: Lease; variant?: "full" | "compact"; className?: string }) {
  const now = useNow();
  const due = new Date(lease.leaseEnd).getTime();
  const start = new Date(lease.leaseStart).getTime();
  const left = due - now;
  const { days, hours, minutes, seconds } = splitDuration(left);
  const tone = dueTone(days);
  const elapsed = Math.min(1, Math.max(0, (now - start) / (due - start)));
  const overdue = left <= 0;
  const agreed = lease.rentReview?.status === "agreed" ? lease.rentReview.agreedRent : undefined;
  const nextRent = agreed ?? lease.annualRent;

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <span className={cn("flex size-10 items-center justify-center rounded-xl", tone.chip)}>
          <CalendarClock className="size-5" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">Rent due {formatDate(lease.leaseEnd)}</p>
          <p className={cn("font-display text-lg font-bold tabular-nums", tone.text)}>
            {overdue ? "Overdue" : `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`}
          </p>
        </div>
      </div>
    );
  }

  const r = 70;
  const c = 2 * Math.PI * r;
  const units = [
    { v: days, l: "Days" },
    { v: hours, l: "Hours" },
    { v: minutes, l: "Minutes" },
    { v: seconds, l: "Seconds" },
  ];

  return (
    <div className={cn("flex flex-col items-center gap-6 sm:flex-row sm:items-center", className)}>
      <div className="relative size-44 shrink-0" role="img" aria-label={`${days} days until rent is due`}>
        <svg viewBox="0 0 160 160" className="size-full -rotate-90">
          <circle cx="80" cy="80" r={r} strokeWidth="10" className="fill-none stroke-muted" />
          <circle cx="80" cy="80" r={r} strokeWidth="10" strokeLinecap="round" className={cn("fill-none transition-all duration-700", tone.ring)} strokeDasharray={c} strokeDashoffset={c * elapsed} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={cn("font-display text-4xl font-extrabold tabular-nums", tone.text)}>{overdue ? "0" : days}</span>
          <span className="text-xs font-medium text-muted-foreground">days left</span>
        </div>
      </div>
      <div className="w-full min-w-0">
        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", tone.chip)}>{overdue ? "Rent overdue" : tone.label}</span>
        <p className="mt-2 text-sm text-muted-foreground">Next rent due</p>
        <p className="font-display text-2xl font-bold">{formatDate(lease.leaseEnd, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        <p className="text-sm text-muted-foreground">
          {formatNaira(nextRent)} for the next year{agreed && agreed !== lease.annualRent && <span className="ml-1 font-medium text-foreground">(new agreed rent)</span>}
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2" aria-live="off">
          {units.map((u) => (
            <div key={u.l} className="rounded-xl border bg-card px-2 py-2.5 text-center">
              <p className="font-display text-xl font-bold tabular-nums">{String(overdue ? 0 : u.v).padStart(2, "0")}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{u.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


