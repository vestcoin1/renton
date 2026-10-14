"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, List, ListPlus, Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import type { Property, SearchFilters } from "@/types";
import { activeFilterCount, filterProperties, filtersFromParams, filtersToParams } from "@/lib/search";
import { PropertyCard, PropertyCardSkeleton } from "@/components/property/property-card";
import { FilterPanel } from "./filter-panel";
import { EmptyState } from "renton-ui/shared/states";
import { Button } from "renton-ui/ui/button";
import { Input } from "renton-ui/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "renton-ui/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "renton-ui/ui/sheet";
import { cn, formatNairaCompact } from "renton-core/utils";

export function SearchView({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(params.get("q") ?? "");

  const filters = useMemo(() => filtersFromParams(new URLSearchParams(params.toString())), [params]);
  const results = useMemo(() => filterProperties(properties, filters), [properties, filters]);
  const count = activeFilterCount(filters);

  // Simulated network latency so loading skeletons are visible, as they would be with a real API.
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, [params]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hd-search-layout");
      if (saved === "grid" || saved === "list") setLayout(saved);
    } catch {}
  }, []);

  const update = (patch: Partial<SearchFilters>) => {
    const next = { ...filters, ...patch };
    startTransition(() => router.replace(`${pathname}?${filtersToParams(next).toString()}`, { scroll: false }));
  };

  const setView = (v: "grid" | "list") => {
    setLayout(v);
    try {
      localStorage.setItem("hd-search-layout", v);
    } catch {}
  };

  const chips: { label: string; clear: Partial<SearchFilters> }[] = [
    filters.q && { label: `â€œ${filters.q}â€`, clear: { q: undefined } },
    filters.state && { label: filters.state, clear: { state: undefined, city: undefined, area: undefined } },
    filters.city && { label: filters.city, clear: { city: undefined, area: undefined } },
    filters.area && { label: filters.area, clear: { area: undefined } },
    filters.type && { label: filters.type, clear: { type: undefined } },
    filters.bedrooms && { label: `${filters.bedrooms}+ beds`, clear: { bedrooms: undefined } },
    filters.bathrooms && { label: `${filters.bathrooms}+ baths`, clear: { bathrooms: undefined } },
    (filters.minBudget || filters.maxBudget) && {
      label: `${formatNairaCompact(filters.minBudget ?? 0)} â€“ ${filters.maxBudget ? formatNairaCompact(filters.maxBudget) : "Any"}`,
      clear: { minBudget: undefined, maxBudget: undefined },
    },
    filters.furnished && { label: "Furnished", clear: { furnished: undefined } },
    filters.parking && { label: "Parking", clear: { parking: undefined } },
    filters.water && { label: "Water supply", clear: { water: undefined } },
    filters.security && { label: "Security", clear: { security: undefined } },
  ].filter(Boolean) as { label: string; clear: Partial<SearchFilters> }[];

  const clearAll = () => {
    setQuery("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  };

  const showSkeleton = loading || isPending;
  const location = filters.area ?? filters.city ?? filters.state ?? "Nigeria";

  return (
    <div className="container-page py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Verified homes for rent in {location}</h1>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {showSkeleton ? "Searchingâ€¦" : `${results.length} verified ${results.length === 1 ? "property" : "properties"} found`}
          </p>
        </div>
        <form
          className="relative w-full lg:max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: query || undefined });
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by area, street or keyword" className="h-11 pl-9" aria-label="Search keyword" />
        </form>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <SlidersHorizontal className="size-4" /> Filters
              </h2>
              {count > 0 && (
                <button onClick={clearAll} className="text-xs font-medium text-primary hover:underline">
                  Clear all ({count})
                </button>
              )}
            </div>
            <FilterPanel filters={filters} onChange={update} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal /> Filters
                  {count > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{count}</span>}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="gap-0 p-0">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto p-5">
                  <FilterPanel filters={filters} onChange={update} />
                </div>
                <div className="flex gap-2 border-t p-4">
                  <Button variant="outline" className="flex-1" onClick={clearAll}>
                    Clear all
                  </Button>
                  <SheetTrigger asChild>
                    <Button className="flex-1">Show {results.length} homes</Button>
                  </SheetTrigger>
                </div>
              </SheetContent>
            </Sheet>

            <AnimatePresence initial={false}>
              {chips.map((c) => (
                <motion.button
                  key={c.label}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => update(c.clear)}
                  className="hidden items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-destructive/40 hover:text-destructive sm:inline-flex"
                  aria-label={`Remove filter ${c.label}`}
                >
                  {c.label} <X className="size-3" />
                </motion.button>
              ))}
            </AnimatePresence>

            <div className="ml-auto flex items-center gap-2">
              <Select value={filters.sort ?? "recommended"} onValueChange={(v) => update({ sort: v as SearchFilters["sort"] })}>
                <SelectTrigger className="h-10 w-[170px]" aria-label="Sort by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="recommended">Recommended</SelectItem>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="price-asc">Price: Low to high</SelectItem>
                  <SelectItem value="price-desc">Price: High to low</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex rounded-lg border bg-card p-0.5" role="group" aria-label="View">
                {(
                  [
                    ["grid", LayoutGrid],
                    ["list", List],
                  ] as const
                ).map(([v, Icon]) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    aria-pressed={layout === v}
                    aria-label={`${v} view`}
                    className={cn("flex size-9 items-center justify-center rounded-md transition-colors", layout === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5">
            {showSkeleton ? (
              <div className={layout === "grid" ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3" : "space-y-4"}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <PropertyCardSkeleton key={i} layout={layout} />
                ))}
              </div>
            ) : results.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No verified homes match these filters"
                description="Try widening your budget or area, or join the waiting list and we'll notify you the moment a match is verified."
                action={{ label: "Clear all filters", onClick: clearAll }}
              />
            ) : (
              <motion.div
                key={layout + params.toString()}
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                className={layout === "grid" ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3" : "space-y-4"}
              >
                {results.map((p, i) => (
                  <motion.div key={p.id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
                    <PropertyCard property={p} layout={layout} priority={i < 3} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>

          {!showSkeleton && (
            <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-dashed bg-subtle p-6 text-center sm:flex-row sm:text-left">
              <div>
                <p className="font-semibold">Didn&apos;t find the right home?</p>
                <p className="text-sm text-muted-foreground">Join the waiting list and get matched with new verified homes before they go public.</p>
              </div>
              <Button asChild variant="success">
                <Link href={`/waiting-list?${filtersToParams(filters).toString()}`}>
                  <ListPlus /> Join Waiting List
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


