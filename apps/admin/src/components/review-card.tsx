"use client";

import { ZoneLink as Link } from "renton-ui/zone-link";
import { ArrowUpRight, CalendarCheck, FileText, TriangleAlert } from "lucide-react";
import type { Property, User, VerificationRequest } from "renton-shared/types";
import { VerificationActions } from "./verification-actions";
import { VerificationBadge } from "renton-ui/property/verification-badge";
import { VerificationFlow } from "renton-ui/shared/verification-flow";
import { SafeImage } from "renton-ui/shared/safe-image";
import { Badge } from "renton-ui/ui/badge";
import { Card } from "renton-ui/ui/card";
import { Progress } from "renton-ui/ui/progress";
import { cn, formatDate, formatNairaCompact, timeAgo } from "renton-core/utils";

const PRIORITY = { high: "bg-destructive", normal: "bg-primary", low: "bg-slate-600" } as const;

export function ReviewCard({ request: v, property: p, landlord }: { request: VerificationRequest; property: Property; landlord?: User }) {
  const done = v.checklist.filter((c) => c.done).length;
  const stage = p.verification;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <Link href={`/admin/verifications/${v.id}`} className="relative aspect-[16/9] sm:aspect-auto sm:w-52 sm:shrink-0">
          <SafeImage src={p.images[0]} alt={p.title} fill sizes="220px" />
          <Badge className={cn("absolute left-2 top-2 border-0 capitalize text-white shadow-sm", PRIORITY[v.priority])}>
            {v.priority} priority
          </Badge>
        </Link>
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/admin/verifications/${v.id}`} className="group flex items-center gap-1 font-semibold hover:text-primary">
                <span className="truncate">{p.title}</span>
                <ArrowUpRight className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {p.area}, {p.city} Â· {formatNairaCompact(p.rent)}/yr Â· {landlord?.name}
              </p>
            </div>
            <VerificationBadge stage={stage} />
          </div>
          <VerificationFlow stage={stage} variant="compact" className="mt-3" />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="size-3.5" /> {v.documents.length} documents
            </span>
            <span>Submitted {timeAgo(v.submittedAt)}</span>
            {v.inspectionDate && (
              <span className="flex items-center gap-1">
                <CalendarCheck className="size-3.5" /> Inspection {formatDate(v.inspectionDate, { day: "numeric", month: "short" })} Â· {v.inspector}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Progress value={(done / v.checklist.length) * 100} className="h-1.5 flex-1" indicatorClassName="bg-success" />
            <span className="text-xs font-medium">
              {done}/{v.checklist.length} checks
            </span>
          </div>
          {v.riskFlags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {v.riskFlags.map((r) => (
                <span key={r} className={cn("inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300")}>
                  <TriangleAlert className="size-3" /> {r}
                </span>
              ))}
            </div>
          )}
          <VerificationActions propertyId={p.id} stage={stage} title={p.title} className="mt-4" />
        </div>
      </div>
    </Card>
  );
}


