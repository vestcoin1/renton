"use client";

import { motion } from "framer-motion";
import { Check, ClipboardList, Search, ShieldCheck, Wrench, X, PartyPopper } from "lucide-react";
import type { MaintenanceStatus } from "renton-shared/types";
import { cn } from "renton-core/utils";

const STEPS = [
  { label: "Reported", icon: ClipboardList },
  { label: "Investigation", icon: Search },
  { label: "Landlord approval", icon: ShieldCheck },
  { label: "Technician", icon: Wrench },
  { label: "Fixed", icon: PartyPopper },
];

/** Index of the step currently in progress (all earlier steps are done). */
const CURRENT: Record<MaintenanceStatus, number> = {
  submitted: 1,
  investigating: 1,
  awaiting_approval: 2,
  declined: 2,
  approved: 3,
  in_progress: 3,
  completed: 5,
};

export function MaintenanceProgress({ status, compact, className }: { status: MaintenanceStatus; compact?: boolean; className?: string }) {
  const current = CURRENT[status];
  const declined = status === "declined";

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)} aria-label={`Repair progress: step ${Math.min(current + 1, 5)} of 5`}>
        {STEPS.map((s, i) => (
          <span
            key={s.label}
            title={s.label}
            className={cn("h-1.5 flex-1 rounded-full", i < current ? "bg-success" : i === current && declined ? "bg-destructive" : i === current ? "bg-primary/50" : "bg-muted")}
          />
        ))}
      </div>
    );
  }

  return (
    <ol className={cn("flex items-start", className)}>
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.label} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span className="absolute right-1/2 top-4 h-0.5 w-full bg-border">
                <motion.span className="block h-full bg-success" initial={{ width: 0 }} animate={{ width: i <= current ? "100%" : "0%" }} transition={{ duration: 0.4, delay: i * 0.1 }} />
              </span>
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 items-center justify-center rounded-full border-2 bg-card",
                done && "border-success bg-success text-white",
                active && !declined && "border-primary text-primary ring-4 ring-primary/15",
                active && declined && "border-destructive text-destructive ring-4 ring-destructive/15",
                !done && !active && "border-border text-muted-foreground"
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} /> : active && declined ? <X className="size-4" /> : <s.icon className="size-4" />}
            </span>
            <span className={cn("mt-2 hidden text-[11px] font-medium leading-tight sm:block", done || active ? "text-foreground" : "text-muted-foreground")}>
              {active && declined ? "Declined" : s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}


