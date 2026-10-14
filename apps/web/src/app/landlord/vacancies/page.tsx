"use client";

import { CalendarClock, DoorOpen, Users } from "lucide-react";
import { toast } from "sonner";
import type { OccupancyStatus } from "@/types";
import { useLandlordData } from "renton-core/hooks";
import { useStore } from "renton-core/store";
import { PageHeader } from "renton-ui/dashboard/widgets";
import { SafeImage } from "renton-ui/shared/safe-image";
import { VerificationBadge } from "renton-ui/property/verification-badge";
import { Card } from "renton-ui/ui/card";
import { Input } from "renton-ui/ui/input";
import { Label } from "renton-ui/ui/label";
import { OCCUPANCY_META } from "renton-core/status";
import { cn, formatNairaCompact } from "renton-core/utils";

const OPTIONS: { value: OccupancyStatus; icon: typeof DoorOpen; active: string }[] = [
  { value: "vacant", icon: DoorOpen, active: "bg-success text-white shadow-sm" },
  { value: "available_soon", icon: CalendarClock, active: "bg-amber-500 text-white shadow-sm" },
  { value: "occupied", icon: Users, active: "bg-primary text-primary-foreground shadow-sm" },
];

export default function VacanciesPage() {
  const { properties } = useLandlordData();
  const setOccupancy = useStore((s) => s.setOccupancy);
  const summary = OPTIONS.map((o) => ({ ...o, count: properties.filter((p) => p.occupancy === o.value).length }));

  return (
    <>
      <PageHeader title="Vacancy management" description="Keep availability accurate. Waiting-list tenants are alerted when a home becomes vacant or available soon." />
      <div className="mb-6 grid grid-cols-3 gap-3">
        {summary.map((s) => (
          <Card key={s.value} className="flex items-center gap-3 p-4">
            <span className={cn("flex size-10 items-center justify-center rounded-xl", s.active)}>
              <s.icon className="size-5" />
            </span>
            <div>
              <p className="font-display text-2xl font-bold">{s.count}</p>
              <p className="text-xs text-muted-foreground">{OCCUPANCY_META[s.value].label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {properties.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <div className="relative aspect-[16/9]">
              <SafeImage src={p.images[0]} alt={p.title} fill sizes="(max-width: 768px) 100vw, 33vw" />
              <VerificationBadge stage={p.verification} appearance="overlay" className="absolute left-3 top-3" />
            </div>
            <div className="p-4">
              <p className="truncate font-semibold">{p.title}</p>
              <p className="text-xs text-muted-foreground">
                {p.area}, {p.city} Â· {formatNairaCompact(p.rent)}/yr
              </p>
              <p className="mb-2 mt-4 text-xs font-medium text-muted-foreground">Mark property as</p>
              <div role="radiogroup" aria-label={`Occupancy for ${p.title}`} className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
                {OPTIONS.map((o) => {
                  const on = p.occupancy === o.value;
                  return (
                    <button
                      key={o.value}
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        if (on) return;
                        setOccupancy(p.id, o.value, o.value === "available_soon" ? new Date(Date.now() + 30 * 86400000).toISOString() : undefined);
                        toast.success(`${p.title.split(",")[0]} marked as ${OCCUPANCY_META[o.value].label.toLowerCase()}`, {
                          description: o.value !== "occupied" ? "Matching waiting-list tenants have been notified." : undefined,
                        });
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-all",
                        on ? o.active : "text-muted-foreground hover:bg-card hover:text-foreground"
                      )}
                    >
                      <o.icon className="size-4" />
                      {OCCUPANCY_META[o.value].label}
                    </button>
                  );
                })}
              </div>
              {p.occupancy === "available_soon" && (
                <div className="mt-3 grid gap-1.5">
                  <Label htmlFor={`date-${p.id}`} className="text-xs">
                    Available from
                  </Label>
                  <Input
                    id={`date-${p.id}`}
                    type="date"
                    className="h-9"
                    value={p.availableFrom.slice(0, 10)}
                    onChange={(e) => e.target.value && setOccupancy(p.id, "available_soon", new Date(e.target.value).toISOString())}
                  />
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}


