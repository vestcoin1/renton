"use client";

import Link from "next/link";
import { ArrowRight, DoorOpen, KeyRound, RefreshCw, Wrench } from "lucide-react";
import type { Lease, MaintenanceRequest, Property } from "@/types";
import { RentCountdown } from "./rent-countdown";
import { NewRepairDialog } from "@/components/maintenance/new-request-dialog";
import { OPEN_STATUSES } from "renton-ui/maintenance/meta";
import { SafeImage } from "renton-ui/shared/safe-image";
import { Button } from "renton-ui/ui/button";
import { Card } from "renton-ui/ui/card";

/** Compact "your current home" summary for the tenant dashboard. */
export function HomeStrip({ lease, property, maintenance }: { lease: Lease; property: Property; maintenance: MaintenanceRequest[] }) {
  const open = maintenance.filter((m) => OPEN_STATUSES.includes(m.status)).length;
  const intent = lease.intent;
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        <div className="relative h-32 lg:h-auto lg:w-56 lg:shrink-0">
          <SafeImage src={property.images[0]} alt={property.title} fill sizes="(max-width: 1024px) 100vw, 224px" />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm">
            <KeyRound className="size-3.5 text-primary" /> My Home
          </span>
        </div>
        <div className="grid flex-1 gap-5 p-5 sm:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr] xl:items-center">
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {lease.unit}, {property.area}
            </p>
            <p className="truncate text-sm text-muted-foreground">{property.title}</p>
            <Button asChild variant="link" className="h-auto px-0 text-sm">
              <Link href="/tenant/home">
                Manage my home <ArrowRight />
              </Link>
            </Button>
          </div>
          <RentCountdown lease={lease} variant="compact" />
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-1 xl:justify-end">
            {intent ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                {intent.decision === "renew" ? <RefreshCw className="size-3.5 text-success" /> : <DoorOpen className="size-3.5 text-amber-500" />}
                {intent.decision === "renew" ? "Renewing" : "Moving out"}
                {!intent.landlordResponse && " Â· awaiting landlord"}
              </span>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href="/tenant/home">Renew or move out?</Link>
              </Button>
            )}
            <NewRepairDialog lease={lease}>
              <Button size="sm">
                <Wrench /> Request repair{open > 0 && <span className="rounded-full bg-white/20 px-1.5 text-[11px]">{open} open</span>}
              </Button>
            </NewRepairDialog>
          </div>
        </div>
      </div>
    </Card>
  );
}


