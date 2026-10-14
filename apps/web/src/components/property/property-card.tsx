"use client";

import Link from "next/link";
import { useState } from "react";
import { Bath, BedDouble, Car, ChevronLeft, ChevronRight, Droplets, MapPin, Maximize, ShieldCheck, Sofa } from "lucide-react";
import type { MatchResult, Property } from "@/types";
import { SafeImage } from "renton-ui/shared/safe-image";
import { VerificationBadge } from "renton-ui/property/verification-badge";
import { SaveButton } from "./save-button";
import { Badge } from "renton-ui/ui/badge";
import { Skeleton } from "renton-ui/ui/skeleton";
import { MatchRing } from "@/components/shared/match-score";
import { OCCUPANCY_META } from "renton-core/status";
import { cn, formatNaira, formatNairaCompact } from "renton-core/utils";

interface Props {
  property: Property;
  layout?: "grid" | "list";
  match?: MatchResult;
  priority?: boolean;
  className?: string;
}

function Gallery({ property, priority, className }: { property: Property; priority?: boolean; className?: string }) {
  const [index, setIndex] = useState(0);
  const images = property.images.slice(0, 5);
  const go = (e: React.MouseEvent, dir: 1 | -1) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + dir + images.length) % images.length);
  };
  return (
    <div className={cn("group/gallery relative overflow-hidden bg-muted", className)}>
      <SafeImage
        key={images[index]}
        src={images[index]}
        alt={index === 0 ? property.title : `${property.title} photo ${index + 1}`}
        fill
        priority={priority && index === 0}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="transition-[opacity,scale] duration-700 group-hover:scale-[1.04]"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => go(e, -1)}
            className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 opacity-0 shadow transition-opacity group-hover/gallery:opacity-100 focus-visible:opacity-100"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => go(e, 1)}
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 opacity-0 shadow transition-opacity group-hover/gallery:opacity-100 focus-visible:opacity-100"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 transition-opacity group-hover/gallery:opacity-100">
            {images.map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full bg-white transition-all", i === index ? "w-4" : "w-1.5 opacity-60")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function PropertyCard({ property: p, layout = "grid", match, priority, className }: Props) {
  const occupancy = OCCUPANCY_META[p.occupancy];
  const perks = [
    p.furnished && { icon: Sofa, label: "Furnished" },
    p.parkingSpaces > 0 && { icon: Car, label: `${p.parkingSpaces} Parking` },
    p.waterSupply.startsWith("Borehole") && { icon: Droplets, label: "Borehole" },
    p.security && { icon: ShieldCheck, label: "Security" },
  ].filter(Boolean) as { icon: typeof Sofa; label: string }[];

  if (layout === "list") {
    return (
      <Link
        href={`/properties/${p.id}`}
        className={cn(
          "group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:flex-row",
          className
        )}
      >
        <div className="relative sm:w-72 sm:shrink-0 lg:w-80">
          <Gallery property={p} priority={priority} className="aspect-[4/3] sm:aspect-auto sm:h-full" />
          <div className="absolute left-3 top-3">
            <VerificationBadge stage={p.verification} appearance="overlay" />
          </div>
          <SaveButton propertyId={p.id} className="absolute right-3 top-3" />
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{p.type}</Badge>
                <Badge variant={occupancy.variant}>{occupancy.label}</Badge>
              </div>
              <h3 className="line-clamp-1 text-lg font-semibold transition-colors group-hover:text-primary">{p.title}</h3>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">
                  {p.area}, {p.city}
                </span>
              </p>
            </div>
            {match && <MatchRing score={match.score} size={56} stroke={5} />}
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <BedDouble className="size-4" /> {p.bedrooms} Bed
            </span>
            <span className="flex items-center gap-1.5">
              <Bath className="size-4" /> {p.bathrooms} Bath
            </span>
            <span className="flex items-center gap-1.5">
              <Maximize className="size-4" /> {p.sizeSqm} mÂ²
            </span>
            {perks.slice(0, 3).map((perk) => (
              <span key={perk.label} className="flex items-center gap-1.5">
                <perk.icon className="size-4" /> {perk.label}
              </span>
            ))}
          </div>
          <div className="mt-auto flex items-end justify-between pt-4">
            <p>
              <span className="font-display text-xl font-bold text-foreground">{formatNaira(p.rent)}</span>
              <span className="text-sm text-muted-foreground"> /year</span>
            </p>
            <span className="text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">View details â†’</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/properties/${p.id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]",
        className
      )}
    >
      <div className="relative">
        <Gallery property={p} priority={priority} className="aspect-[4/3]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <VerificationBadge stage={p.verification} appearance="overlay" />
          {p.occupancy === "available_soon" && (
            <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">Available Soon</span>
          )}
        </div>
        <SaveButton propertyId={p.id} className="absolute right-3 top-3" />
        {match && (
          <div className="absolute bottom-3 right-3 rounded-full bg-white/95 p-0.5 shadow dark:bg-slate-900/95">
            <MatchRing score={match.score} size={48} stroke={4} />
          </div>
        )}
        <p className="absolute bottom-3 left-3 font-display text-lg font-bold text-white drop-shadow">
          {formatNairaCompact(p.rent)}
          <span className="text-sm font-medium text-white/85">/yr</span>
        </p>
      </div>
      <div className="@container flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">{p.type}</p>
        <h3 className="mt-1 line-clamp-1 font-semibold transition-colors group-hover:text-primary">{p.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">
            {p.area}, {p.city}
          </span>
        </p>
        <div className="mt-3 flex items-center gap-4 border-t pt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5" title="Bedrooms">
            <BedDouble className="size-4" /> {p.bedrooms}
          </span>
          <span className="flex items-center gap-1.5" title="Bathrooms">
            <Bath className="size-4" /> {p.bathrooms}
          </span>
          <span className="flex items-center gap-1.5" title="Floor area">
            <Maximize className="size-4" /> {p.sizeSqm}mÂ²
          </span>
          {perks[0] && (
            <span className="ml-auto hidden items-center gap-1.5 text-xs @[16.5rem]:flex" title={perks[0].label}>
              {(() => {
                const PerkIcon = perks[0].icon;
                return <PerkIcon className="size-3.5" />;
              })()}
              {perks[0].label}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function PropertyCardSkeleton({ layout = "grid" }: { layout?: "grid" | "list" }) {
  if (layout === "list") {
    return (
      <div className="flex flex-col overflow-hidden rounded-2xl border bg-card sm:flex-row">
        <Skeleton className="aspect-[4/3] rounded-none sm:aspect-auto sm:h-56 sm:w-80" />
        <div className="flex-1 space-y-3 p-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-7 w-32" />
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-4 border-t pt-3">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    </div>
  );
}


