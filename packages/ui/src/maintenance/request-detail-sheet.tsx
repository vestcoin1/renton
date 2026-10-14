"use client";

import { BadgeCheck, CalendarClock, CircleCheck, CircleX, ClipboardList, MapPin, Phone, Search, Star, UserRound } from "lucide-react";
import type { MaintenanceRequest, Property, User } from "renton-shared/types";
import { useTechnicians } from "renton-core/hooks";
import { Badge } from "../ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";
import { MaintenanceProgress } from "./maintenance-progress";
import { MediaGallery } from "./media";
import { MAINTENANCE_STATUS, URGENCY } from "./meta";
import { cn, formatDate, formatNaira, timeAgo } from "renton-core/utils";

interface Props {
  request: MaintenanceRequest | null;
  property?: Property;
  tenant?: User;
  perspective: "tenant" | "landlord" | "admin";
  onClose: () => void;
  /** Role-specific actions (approve, dispatch, rateâ€¦) rendered in the sticky footer. */
  actions?: React.ReactNode;
}

function Section({ title, icon: Icon, children, tone }: { title: string; icon: typeof Search; children: React.ReactNode; tone?: string }) {
  return (
    <section className={cn("rounded-xl border p-4", tone)}>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-muted-foreground" /> {title}
      </h3>
      {children}
    </section>
  );
}

export function MaintenanceDetailSheet({ request: r, property, tenant, perspective, onClose, actions }: Props) {
  const tech = useTechnicians().find((t) => t.id === r?.technician?.technicianId);
  return (
    <Sheet open={!!r} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="gap-0 p-0 sm:max-w-xl">
        {r && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={MAINTENANCE_STATUS[r.status].variant}>
                  {perspective === "tenant" ? MAINTENANCE_STATUS[r.status].tenantLabel : MAINTENANCE_STATUS[r.status].label}
                </Badge>
                <Badge variant={URGENCY[r.urgency].variant}>{URGENCY[r.urgency].label} urgency</Badge>
                <span className="text-xs text-muted-foreground">#{r.id.toUpperCase()}</span>
              </div>
              <SheetTitle className="pt-1">{r.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" />
                {r.location}
                {property && ` Â· ${property.title}, ${property.area}`}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <MaintenanceProgress status={r.status} />

              <div>
                <p className="text-sm leading-relaxed text-muted-foreground">{r.description}</p>
                {perspective !== "tenant" && tenant && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserRound className="size-3.5" /> Reported by {tenant.name} Â· {formatDate(r.createdAt)}
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Photos &amp; videos</p>
                <MediaGallery media={r.media} />
              </div>

              {r.investigation && (
                <Section title="renton investigation report" icon={Search} tone="bg-violet-500/5 border-violet-500/20">
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Findings</dt>
                      <dd>{r.investigation.findings}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Recommended fix</dt>
                      <dd>{r.investigation.recommendedFix}</dd>
                    </div>
                    <div className="flex items-end justify-between border-t pt-2">
                      <div>
                        <dt className="text-xs text-muted-foreground">Estimated cost</dt>
                        <dd className="font-display text-lg font-bold">{formatNaira(r.investigation.estimatedCost)}</dd>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.investigation.investigator} Â· {timeAgo(r.investigation.at)}
                      </p>
                    </div>
                  </dl>
                </Section>
              )}

              {r.landlordDecision && (
                <Section
                  title={r.landlordDecision.approved ? "Landlord approved" : "Landlord declined"}
                  icon={r.landlordDecision.approved ? CircleCheck : CircleX}
                  tone={r.landlordDecision.approved ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}
                >
                  <p className="text-sm text-muted-foreground">{r.landlordDecision.note || (r.landlordDecision.approved ? "Approved without comment." : "No reason given.")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.landlordDecision.at)}</p>
                </Section>
              )}

              {tech && r.technician && (
                <Section title="Assigned technician" icon={CalendarClock}>
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                      {tech.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-sm font-semibold">
                        {tech.name} <BadgeCheck className="size-4 text-success" />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tech.trade} Â· {tech.company} Â· <Star className="inline size-3 fill-amber-400 text-amber-400" /> {tech.rating} ({tech.jobsCompleted} jobs)
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="size-4 text-primary" />
                      {formatDate(r.technician.scheduledFor, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </span>
                    {perspective !== "landlord" && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="size-4" /> {tech.phone}
                      </span>
                    )}
                  </div>
                </Section>
              )}

              {r.completion && (
                <Section title="Work completed" icon={CircleCheck} tone="bg-success/5 border-success/20">
                  <p className="text-sm">{r.completion.note}</p>
                  {r.tenantFeedback && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      Tenant rating:
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("size-3.5", i < r.tenantFeedback!.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                      ))}
                      {r.tenantFeedback.comment && <span>Â· â€œ{r.tenantFeedback.comment}â€</span>}
                    </p>
                  )}
                </Section>
              )}

              <Section title="Timeline" icon={ClipboardList}>
                <ol className="relative space-y-4 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-border">
                  {[...r.timeline].reverse().map((t, i) => (
                    <li key={t.id} className="relative flex gap-3 pl-5">
                      <span className={cn("absolute left-0 top-1 size-[11px] rounded-full border-2 border-card", i === 0 ? "bg-primary" : "bg-muted-foreground/40")} />
                      <div>
                        <p className="text-sm font-medium">{t.label}</p>
                        {t.note && <p className="text-xs text-muted-foreground">{t.note}</p>}
                        <p className="text-[11px] text-muted-foreground">
                          {t.by} Â· {formatDate(t.at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>
            </div>

            {actions && <div className="border-t bg-subtle p-4">{actions}</div>}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}


