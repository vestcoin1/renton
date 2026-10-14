"use client";

import { motion } from "framer-motion";
import { Check, ClipboardCheck, FilePen, Globe, ScanSearch, Send, ShieldCheck, TriangleAlert, X } from "lucide-react";
import type { VerificationStage } from "renton-shared/types";
import { VERIFICATION_FLOW, flowIndex } from "renton-core/status";
import { cn } from "renton-core/utils";

const ICONS = [FilePen, Send, ClipboardCheck, ScanSearch, ShieldCheck, Globe];

interface Props {
  stage: VerificationStage;
  variant?: "full" | "compact" | "vertical";
  className?: string;
}

/**
 * Visualises Draft â†’ Submitted â†’ Inspection Scheduled â†’ Under Review â†’ Verified â†’ Published.
 * Used on property details, landlord listings, the add-property wizard and admin review.
 */
export function VerificationFlow({ stage, variant = "full", className }: Props) {
  const current = flowIndex(stage);
  const blocked = stage === "rejected" || stage === "changes_requested";

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-1", className)} aria-label={`Verification step ${current + 1} of ${VERIFICATION_FLOW.length}`}>
        {VERIFICATION_FLOW.map((s, i) => (
          <span
            key={s.stage}
            title={s.label}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < current || (i === current && !blocked) ? "bg-success" : i === current && blocked ? "bg-amber-500" : "bg-muted"
            )}
          />
        ))}
      </div>
    );
  }

  if (variant === "vertical") {
    return (
      <ol className={cn("relative space-y-0", className)}>
        {VERIFICATION_FLOW.map((s, i) => {
          const done = i < current || (i === current && !blocked && (stage === "published" || i < current));
          const active = i === current;
          const Icon = ICONS[i];
          return (
            <li key={s.stage} className="relative flex gap-3 pb-6 last:pb-0">
              {i < VERIFICATION_FLOW.length - 1 && (
                <span className={cn("absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5", i < current ? "bg-success" : "bg-border")} />
              )}
              <span
                className={cn(
                  "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  done && "border-success bg-success text-white",
                  active && !done && !blocked && "border-primary bg-primary/10 text-primary",
                  active && blocked && "border-amber-500 bg-amber-500/10 text-amber-600",
                  !done && !active && "border-border bg-card text-muted-foreground"
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : active && blocked ? <TriangleAlert className="size-4" /> : <Icon className="size-4" />}
                {active && !done && !blocked && <span className="absolute inset-0 animate-ping rounded-full border-2 border-primary/40" />}
              </span>
              <div className="pt-1">
                <p className={cn("text-sm font-medium", !done && !active && "text-muted-foreground")}>
                  {active && blocked ? (stage === "rejected" ? "Rejected" : "Changes Requested") : s.label}
                </p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <ol className="flex items-start">
        {VERIFICATION_FLOW.map((s, i) => {
          const done = i < current || (i === current && stage === "published");
          const active = i === current && !done;
          const Icon = ICONS[i];
          return (
            <li key={s.stage} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && (
                <span className="absolute right-1/2 top-4 -z-0 h-0.5 w-full bg-border">
                  <motion.span
                    className="block h-full bg-success"
                    initial={{ width: 0 }}
                    animate={{ width: i <= current ? "100%" : "0%" }}
                    transition={{ duration: 0.4, delay: i * 0.12 }}
                  />
                </span>
              )}
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className={cn(
                  "relative z-10 flex size-8 items-center justify-center rounded-full border-2 bg-card transition-colors",
                  done && "border-success bg-success text-white",
                  active && !blocked && "border-primary text-primary ring-4 ring-primary/15",
                  active && blocked && "border-amber-500 text-amber-600 ring-4 ring-amber-500/15",
                  !done && !active && "border-border text-muted-foreground"
                )}
              >
                {done ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : active && stage === "rejected" ? (
                  <X className="size-4" />
                ) : active && blocked ? (
                  <TriangleAlert className="size-4" />
                ) : (
                  <Icon className="size-4" />
                )}
              </motion.span>
              <span
                className={cn(
                  "mt-2 hidden max-w-[7rem] text-[11px] font-medium leading-tight sm:block",
                  done || active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {active && blocked ? (stage === "rejected" ? "Rejected" : "Changes Requested") : s.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-center text-xs font-medium text-muted-foreground sm:hidden">
        Step {current + 1} of {VERIFICATION_FLOW.length}: {VERIFICATION_FLOW[current]?.label}
      </p>
    </div>
  );
}


