"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { MatchResult } from "@/types";
import { scoreTone } from "@/lib/matching";
import { cn } from "renton-core/utils";

export function MatchRing({ score, size = 96, stroke = 8, className }: { score: number; size?: number; stroke?: number; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={`Match score ${score}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn("fill-none", tone.ring)}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c - (score / 100) * c }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-display font-bold leading-none", size >= 90 ? "text-2xl" : "text-sm")}>{score}%</span>
        {size >= 90 && <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Match</span>}
      </div>
    </div>
  );
}

export function MatchScoreCard({ match, className, compact }: { match: MatchResult; className?: string; compact?: boolean }) {
  const tone = scoreTone(match.score);
  const reasons = compact ? match.reasons.filter((r) => r.met).slice(0, 3) : match.reasons;
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <MatchRing score={match.score} size={compact ? 64 : 96} stroke={compact ? 6 : 8} />
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold", tone.className)}>{tone.label}</p>
        <ul className="mt-1.5 space-y-1">
          {reasons.map((r) => (
            <li key={r.label} className={cn("flex items-center gap-1.5 text-xs", r.met ? "text-foreground" : "text-muted-foreground")}>
              {r.met ? <Check className="size-3.5 text-success" strokeWidth={3} /> : <X className="size-3.5 text-muted-foreground" />}
              {r.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


