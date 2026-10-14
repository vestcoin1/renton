import { BadgeCheck, Clock, ShieldAlert } from "lucide-react";
import type { VerificationStage } from "renton-shared/types";
import { Badge } from "../ui/badge";
import { VERIFICATION_META } from "renton-core/status";
import { cn } from "renton-core/utils";

interface Props {
  stage: VerificationStage;
  /** "overlay" = frosted pill for use on photos */
  appearance?: "badge" | "overlay";
  className?: string;
}

export function VerificationBadge({ stage, appearance = "badge", className }: Props) {
  const verified = stage === "verified" || stage === "published";
  const meta = VERIFICATION_META[stage];
  const Icon = verified ? BadgeCheck : stage === "rejected" ? ShieldAlert : Clock;

  if (appearance === "overlay") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur dark:bg-slate-900/90",
          verified ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300",
          className
        )}
      >
        <Icon className="size-3.5" />
        {verified ? "Verified" : meta.label}
      </span>
    );
  }

  return (
    <Badge variant={meta.variant} className={className}>
      <Icon />
      {meta.label}
    </Badge>
  );
}


