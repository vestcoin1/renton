"use client";

import { Car, Droplets, ShieldCheck, Sofa, type LucideIcon } from "lucide-react";
import type { PropertyType, SearchFilters } from "@/types";
import { Label } from "renton-ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "renton-ui/ui/select";
import { Slider } from "renton-ui/ui/slider";
import { Switch } from "renton-ui/ui/switch";
import { MAX_BUDGET, PROPERTY_TYPES, STATES, areasFor, citiesFor } from "renton-shared/reference";
import { cn, formatNairaCompact } from "renton-core/utils";

const ANY = "__any";

function Segmented({ value, onChange, label }: { value?: number; onChange: (v?: number) => void; label: string }) {
  const options = [undefined, 1, 2, 3, 4, 5];
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-6 gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={String(o)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o)}
            className={cn(
              "rounded-md py-1.5 text-xs font-medium transition-all",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o === undefined ? "Any" : o === 5 ? "5+" : o}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ icon: Icon, label, checked, onChange, id }: { icon: LucideIcon; label: string; checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 font-normal">
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </span>
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-b py-5 first:pt-0 last:border-0 last:pb-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

export function FilterPanel({ filters, onChange }: { filters: SearchFilters; onChange: (patch: Partial<SearchFilters>) => void }) {
  const cities = citiesFor(filters.state);
  const areas = areasFor(filters.city);
  const budget: [number, number] = [filters.minBudget ?? 0, filters.maxBudget ?? MAX_BUDGET];

  return (
    <div>
      <Section title="Location">
        <Select
          value={filters.state ?? ANY}
          onValueChange={(v) => {
            const state = v === ANY ? undefined : v;
            const c = citiesFor(state);
            onChange({ state, city: state && c.length === 1 ? c[0] : undefined, area: undefined });
          }}
        >
          <SelectTrigger aria-label="State">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All states</SelectItem>
            {STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.city ?? ANY} onValueChange={(v) => onChange({ city: v === ANY ? undefined : v, area: undefined })}>
          <SelectTrigger aria-label="City">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All cities</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.area ?? ANY} onValueChange={(v) => onChange({ area: v === ANY ? undefined : v })} disabled={!areas.length}>
          <SelectTrigger aria-label="Area">
            <SelectValue placeholder={areas.length ? "Area" : "Select a city first"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All areas</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      <Section title="Property type">
        <div className="flex flex-wrap gap-2">
          {(["Any", ...PROPERTY_TYPES] as (PropertyType | "Any")[]).map((t) => {
            const active = (filters.type ?? "Any") === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ type: t === "Any" ? undefined : t })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Bedrooms">
        <Segmented label="Minimum bedrooms" value={filters.bedrooms} onChange={(v) => onChange({ bedrooms: v })} />
      </Section>
      <Section title="Bathrooms">
        <Segmented label="Minimum bathrooms" value={filters.bathrooms} onChange={(v) => onChange({ bathrooms: v })} />
      </Section>

      <Section title="Budget range (per year)">
        <Slider
          min={0}
          max={MAX_BUDGET}
          step={250_000}
          value={budget}
          thumbLabels={["Minimum budget", "Maximum budget"]}
          onValueChange={([min, max]) => onChange({ minBudget: min || undefined, maxBudget: max >= MAX_BUDGET ? undefined : max })}
        />
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="rounded-lg border bg-muted/50 px-3 py-1.5 font-medium">{formatNairaCompact(budget[0])}</span>
          <span className="h-px flex-1 bg-border" />
          <span className="rounded-lg border bg-muted/50 px-3 py-1.5 font-medium">
            {budget[1] >= MAX_BUDGET ? `${formatNairaCompact(MAX_BUDGET)}+` : formatNairaCompact(budget[1])}
          </span>
        </div>
      </Section>

      <Section title="Features">
        <Toggle id="f-furnished" icon={Sofa} label="Furnished" checked={!!filters.furnished} onChange={(v) => onChange({ furnished: v || undefined })} />
        <Toggle id="f-parking" icon={Car} label="Parking" checked={!!filters.parking} onChange={(v) => onChange({ parking: v || undefined })} />
        <Toggle id="f-water" icon={Droplets} label="Reliable water supply" checked={!!filters.water} onChange={(v) => onChange({ water: v || undefined })} />
        <Toggle id="f-security" icon={ShieldCheck} label="24/7 Security" checked={!!filters.security} onChange={(v) => onChange({ security: v || undefined })} />
      </Section>
    </div>
  );
}


