"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "renton-ui/ui/select";
import { Button } from "renton-ui/ui/button";
import { BUDGET_RANGES, PROPERTY_TYPES, areasFor, citiesFor } from "renton-shared/reference";
import { filtersToParams } from "@/lib/search";

const ANY = "__any";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 flex-1 px-3 py-1.5">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

const triggerCls = "h-6 border-0 bg-transparent px-0 py-0 text-sm font-medium shadow-none focus-visible:ring-0 [&>span]:truncate";

export function HeroSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [city, setCity] = useState<string>();
  const [area, setArea] = useState<string>();
  const [type, setType] = useState<string>();
  const [budget, setBudget] = useState<string>();

  const build = () => {
    const range = BUDGET_RANGES.find((b) => b.label === budget);
    return filtersToParams({
      city,
      area,
      type: type as never,
      minBudget: range?.min || undefined,
      maxBudget: range?.max,
    }).toString();
  };

  const cities = citiesFor();
  const areas = areasFor(city);
  const v = (x?: string) => x ?? ANY;
  const set = (fn: (x?: string) => void) => (x: string) => fn(x === ANY ? undefined : x);

  return (
    <div className={className}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/properties?${build()}`);
        }}
        className="flex flex-col gap-1.5 rounded-2xl border bg-card/95 p-1.5 shadow-xl shadow-brand-900/10 backdrop-blur-xl md:flex-row md:items-center"
        aria-label="Search properties"
      >
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-y-1 md:flex md:divide-x md:divide-border">
          <Field label="City">
            <Select
              value={v(city)}
              onValueChange={set((x) => {
                setCity(x);
                setArea(undefined);
              })}
            >
              <SelectTrigger className={triggerCls} aria-label="City">
                <SelectValue placeholder="Any city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any city</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Area">
            <Select value={v(area)} onValueChange={set(setArea)} disabled={!areas.length}>
              <SelectTrigger className={triggerCls} aria-label="Area">
                <SelectValue placeholder={areas.length ? "Any area" : "Pick a city"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any area</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Type">
            <Select value={v(type)} onValueChange={set(setType)}>
              <SelectTrigger className={triggerCls} aria-label="Property type">
                <SelectValue placeholder="Any type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any type</SelectItem>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Budget">
            <Select value={v(budget)} onValueChange={set(setBudget)}>
              <SelectTrigger className={triggerCls} aria-label="Budget">
                <SelectValue placeholder="Any budget" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any budget</SelectItem>
                {BUDGET_RANGES.map((b) => (
                  <SelectItem key={b.label} value={b.label}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Button type="submit" className="h-11 shrink-0 rounded-xl px-5">
          <Search /> Search
        </Button>
      </form>
      <button
        type="button"
        onClick={() => router.push(`/waiting-list?${build()}`)}
        className="group mt-3 inline-flex items-center gap-1 px-1 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        Can&apos;t find the right home? <span className="font-semibold text-primary">Join the waiting list</span>
        <ArrowRight className="size-3.5 text-primary transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}


