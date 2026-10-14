"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, CalendarClock, DoorOpen, Eye, EllipsisVertical, PlusCircle, Search, Send, Users } from "lucide-react";
import { toast } from "sonner";
import type { OccupancyStatus, Property } from "@/types";
import { useLandlordData } from "renton-core/hooks";
import { useStore } from "renton-core/store";
import { PageHeader } from "renton-ui/dashboard/widgets";
import { VerificationBadge } from "renton-ui/property/verification-badge";
import { VerificationFlow } from "renton-ui/shared/verification-flow";
import { SafeImage } from "renton-ui/shared/safe-image";
import { EmptyState } from "renton-ui/shared/states";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card } from "renton-ui/ui/card";
import { Input } from "renton-ui/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "renton-ui/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "renton-ui/ui/table";
import { Tabs, TabsList, TabsTrigger } from "renton-ui/ui/tabs";
import { OCCUPANCY_META } from "renton-core/status";
import { cn, formatNaira, formatNairaCompact } from "renton-core/utils";

type Filter = "all" | "live" | "pipeline" | "draft";
const isLive = (p: Property) => p.verification === "published" || p.verification === "verified";

function RowActions({ p }: { p: Property }) {
  const setOccupancy = useStore((s) => s.setOccupancy);
  const submit = useStore((s) => s.submitForVerification);
  const occ = (o: OccupancyStatus) => {
    setOccupancy(p.id, o);
    toast.success(`Marked as ${OCCUPANCY_META[o].label.toLowerCase()}`);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${p.title}`}>
          <EllipsisVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {isLive(p) && (
          <DropdownMenuItem asChild>
            <Link href={`/properties/${p.id}`}>
              <Eye /> View listing
            </Link>
          </DropdownMenuItem>
        )}
        {(p.verification === "draft" || p.verification === "changes_requested") && (
          <DropdownMenuItem
            onSelect={() => {
              submit(p.id);
              toast.success("Submitted for verification", { description: "Our team will schedule an inspection within 48 hours." });
            }}
          >
            <Send /> Submit for verification
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Mark property as</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => occ("vacant")} disabled={p.occupancy === "vacant"}>
          <DoorOpen /> Vacant
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => occ("available_soon")} disabled={p.occupancy === "available_soon"}>
          <CalendarClock /> Available soon
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => occ("occupied")} disabled={p.occupancy === "occupied"}>
          <Users /> Occupied
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function LandlordPropertiesPage() {
  const { properties } = useLandlordData();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const counts = {
    all: properties.length,
    live: properties.filter(isLive).length,
    pipeline: properties.filter((p) => !isLive(p) && p.verification !== "draft").length,
    draft: properties.filter((p) => p.verification === "draft").length,
  };

  const rows = useMemo(
    () =>
      properties.filter((p) => {
        if (filter === "live" && !isLive(p)) return false;
        if (filter === "pipeline" && (isLive(p) || p.verification === "draft")) return false;
        if (filter === "draft" && p.verification !== "draft") return false;
        const s = q.toLowerCase();
        return !s || [p.title, p.area, p.city].some((x) => x.toLowerCase().includes(s));
      }),
    [properties, filter, q]
  );

  return (
    <>
      <PageHeader
        title="Properties"
        description="Manage listings, verification and occupancy across your portfolio."
        actions={
          <Button asChild>
            <Link href="/landlord/properties/new">
              <PlusCircle /> Add property
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="h-auto flex-wrap">
            {(
              [
                ["all", "All"],
                ["live", "Live"],
                ["pipeline", "In verification"],
                ["draft", "Drafts"],
              ] as const
            ).map(([v, l]) => (
              <TabsTrigger key={v} value={v}>
                {l} <span className="text-[11px] text-muted-foreground">{counts[v]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search properties" className="pl-9" aria-label="Search properties" />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Building2} title="No properties here" description="Try another filter, or add a new property to get started." action={{ label: "Add property", href: "/landlord/properties/new" }} />
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Property</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead className="text-right">Rent / yr</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const occ = OCCUPANCY_META[p.occupancy];
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
                            <SafeImage src={p.images[0]} alt="" fill sizes="48px" />
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[260px] truncate font-medium">{p.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.type} Â· {p.bedrooms} bed
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <p>{p.area}</p>
                        <p className="text-xs text-muted-foreground">{p.city}</p>
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <VerificationBadge stage={p.verification} />
                        <VerificationFlow stage={p.verification} variant="compact" className="mt-2 max-w-[160px]" />
                      </TableCell>
                      <TableCell>
                        <Badge variant={occ.variant}>
                          <span className={cn("size-1.5 rounded-full", occ.dot)} /> {occ.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">{formatNaira(p.rent)}</TableCell>
                      <TableCell>
                        <RowActions p={p} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <div className="grid gap-3 md:hidden">
            {rows.map((p) => {
              const occ = OCCUPANCY_META[p.occupancy];
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex gap-3">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg">
                      <SafeImage src={p.images[0]} alt="" fill sizes="64px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.area}, {p.city}
                      </p>
                      <p className="mt-1 text-sm font-semibold">{formatNairaCompact(p.rent)}/yr</p>
                    </div>
                    <RowActions p={p} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <VerificationBadge stage={p.verification} />
                    <Badge variant={occ.variant}>{occ.label}</Badge>
                  </div>
                  <VerificationFlow stage={p.verification} variant="compact" className="mt-3" />
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}


