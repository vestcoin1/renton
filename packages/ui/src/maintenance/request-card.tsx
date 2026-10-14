"use client";

import { Camera, ChevronRight, Video } from "lucide-react";
import type { MaintenanceRequest, Property, User } from "renton-shared/types";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { MaintenanceProgress } from "./maintenance-progress";
import { MAINTENANCE_STATUS, URGENCY, categoryIcon } from "./meta";
import { cn, timeAgo } from "renton-core/utils";

interface Props {
  request: MaintenanceRequest;
  property?: Property;
  tenant?: User;
  perspective: "tenant" | "landlord" | "admin";
  onOpen: () => void;
  highlight?: boolean;
}

export function MaintenanceRequestCard({ request: r, property, tenant, perspective, onOpen, highlight }: Props) {
  const Icon = categoryIcon(r.category);
  const status = MAINTENANCE_STATUS[r.status];
  const urgency = URGENCY[r.urgency];
  const photos = r.media.filter((m) => m.kind === "image").length;
  const videos = r.media.length - photos;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      className={cn("group cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:p-5", highlight && "border-amber-500/50 ring-2 ring-amber-500/15")}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate font-semibold group-hover:text-primary">{r.title}</p>
            <span className="text-xs text-muted-foreground">#{r.id.toUpperCase()}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {r.category} Â· {r.location}
            {perspective !== "tenant" && property && ` Â· ${property.area}, ${property.city}`}
            {perspective !== "tenant" && tenant && ` Â· ${tenant.name}`}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant={status.variant}>{perspective === "tenant" ? status.tenantLabel : status.label}</Badge>
        <Badge variant={urgency.variant}>
          <span className={cn("size-1.5 rounded-full", urgency.dot)} /> {urgency.label}
        </Badge>
        <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {photos > 0 && (
            <span className="flex items-center gap-1">
              <Camera className="size-3.5" /> {photos}
            </span>
          )}
          {videos > 0 && (
            <span className="flex items-center gap-1">
              <Video className="size-3.5" /> {videos}
            </span>
          )}
          <span>{timeAgo(r.updatedAt)}</span>
        </span>
      </div>
      <MaintenanceProgress status={r.status} compact className="mt-3" />
    </Card>
  );
}


