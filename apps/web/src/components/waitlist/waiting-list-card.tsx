"use client";

import Link from "next/link";
import { BedDouble, Building, CalendarClock, EllipsisVertical, MapPin, Pause, Play, Sparkles, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { Property, WaitingList } from "@/types";
import { topMatches } from "@/lib/matching";
import { useStore } from "renton-core/store";
import { Badge } from "renton-ui/ui/badge";
import { Card } from "renton-ui/ui/card";
import { Button } from "renton-ui/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "renton-ui/ui/dropdown-menu";
import { MatchRing } from "@/components/shared/match-score";
import { SafeImage } from "renton-ui/shared/safe-image";
import { cn, formatDate, formatNairaCompact } from "renton-core/utils";

const STATUS = {
  active: { label: "Active Â· searching", variant: "success" as const, dot: "bg-success animate-pulse" },
  paused: { label: "Paused", variant: "neutral" as const, dot: "bg-muted-foreground" },
  matched: { label: "Matched", variant: "violet" as const, dot: "bg-violet-500" },
};

export function WaitingListCard({ list, properties }: { list: WaitingList; properties: Property[] }) {
  const setStatus = useStore((s) => s.setWaitingListStatus);
  const remove = useStore((s) => s.deleteWaitingList);
  const matches = topMatches(list, properties, 3);
  const meta = STATUS[list.status];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b p-5">
        <div className="min-w-0">
          <Badge variant={meta.variant}>
            <span className={cn("size-1.5 rounded-full", meta.dot)} /> {meta.label}
          </Badge>
          <h3 className="mt-2 truncate text-lg font-semibold">
            {list.propertyType === "Any" ? "Any home" : list.propertyType} in {list.city}
          </h3>
          <p className="text-xs text-muted-foreground">Created {formatDate(list.createdAt)}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Waiting list options">
              <EllipsisVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {list.status === "paused" ? (
              <DropdownMenuItem onSelect={() => (setStatus(list.id, "active"), toast.success("Waiting list resumed"))}>
                <Play /> Resume alerts
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => (setStatus(list.id, "paused"), toast("Waiting list paused"))}>
                <Pause /> Pause alerts
              </DropdownMenuItem>
            )}
            <DropdownMenuItem destructive onSelect={() => (remove(list.id), toast("Waiting list deleted"))}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <dl className="grid grid-cols-2 gap-3 p-5 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Preferred location</dt>
            <dd className="truncate font-medium">{list.areas.length ? list.areas.join(", ") : `Anywhere in ${list.city}`}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Wallet className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-xs text-muted-foreground">Budget</dt>
            <dd className="font-medium">
              {formatNairaCompact(list.minBudget)} â€“ {formatNairaCompact(list.maxBudget)}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Building className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-xs text-muted-foreground">Property type</dt>
            <dd className="font-medium">{list.propertyType}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <BedDouble className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-xs text-muted-foreground">Bedrooms</dt>
            <dd className="font-medium">{list.bedrooms}+</dd>
          </div>
        </div>
        <div className="col-span-2 flex items-start gap-2">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-xs text-muted-foreground">Move-in</dt>
            <dd className="font-medium">{list.moveIn}</dd>
          </div>
        </div>
      </dl>
      <div className="border-t bg-subtle p-5">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="size-4 text-violet-500" /> {matches.length ? `Top ${matches.length} matches` : "No matches yet"}
        </p>
        {matches.length ? (
          <ul className="space-y-2">
            {matches.map(({ property: p, match }) => (
              <li key={p.id}>
                <Link href={`/properties/${p.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-2 pr-3 transition-colors hover:border-primary/40">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
                    <SafeImage src={p.images[0]} alt="" fill sizes="48px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.area} Â· {formatNairaCompact(p.rent)}/yr
                    </p>
                  </div>
                  <MatchRing score={match.score} size={42} stroke={4} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">We&apos;ll notify you as soon as a verified home scores above 50%.</p>
        )}
      </div>
    </Card>
  );
}


