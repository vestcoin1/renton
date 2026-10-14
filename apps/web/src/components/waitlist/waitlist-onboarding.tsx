"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building,
  Building2,
  Castle,
  Check,
  DoorOpen,
  Hotel,
  House,
  HousePlus,
  Loader2,
  MapPin,
  Sparkles,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { PropertyType, WaitingList } from "@/types";
import { CITIES, MAX_BUDGET, areasFor } from "renton-shared/reference";
import { usePublicProperties } from "renton-core/hooks";
import { topMatches } from "@/lib/matching";
import { useStore } from "renton-core/store";
import { Button } from "renton-ui/ui/button";
import { Slider } from "renton-ui/ui/slider";
import { Progress } from "renton-ui/ui/progress";
import { MatchScoreCard } from "@/components/shared/match-score";
import { SafeImage } from "renton-ui/shared/safe-image";
import { VerificationBadge } from "renton-ui/property/verification-badge";
import { EmptyState } from "renton-ui/shared/states";
import { cn, formatNaira, formatNairaCompact, sleep } from "renton-core/utils";

const TYPE_OPTIONS: { value: PropertyType | "Any"; icon: LucideIcon; hint: string }[] = [
  { value: "Any", icon: Sparkles, hint: "Show me everything" },
  { value: "Self Contain", icon: DoorOpen, hint: "Single room + bath" },
  { value: "Mini Flat", icon: House, hint: "1 bed + living room" },
  { value: "Apartment", icon: Building, hint: "Flats & serviced units" },
  { value: "Terrace", icon: Building2, hint: "Multi-level, shared walls" },
  { value: "Bungalow", icon: Warehouse, hint: "Single-storey detached" },
  { value: "Duplex", icon: Castle, hint: "Two-storey family home" },
  { value: "Penthouse", icon: Hotel, hint: "Top-floor luxury" },
];

const MOVE_IN: WaitingList["moveIn"][] = ["Immediately", "Within 1 month", "1-3 months", "Flexible"];

const STEPS = [
  { title: "Where do you want to live?", subtitle: "Pick a city, then the areas you'd love to live in.", icon: MapPin },
  { title: "What type of home?", subtitle: "We'll prioritise this, but may suggest close alternatives.", icon: House },
  { title: "What's your annual budget?", subtitle: "Rent in Nigeria is usually paid yearly.", icon: Wallet },
  { title: "Bedrooms & timing", subtitle: "How much space do you need, and when?", icon: BedDouble },
];

const BUDGET_PRESETS = [
  { label: "Under â‚¦1M", v: [0, 1_000_000] },
  { label: "â‚¦1Mâ€“3M", v: [1_000_000, 3_000_000] },
  { label: "â‚¦3Mâ€“6M", v: [3_000_000, 6_000_000] },
  { label: "â‚¦6Mâ€“12M", v: [6_000_000, 12_000_000] },
  { label: "â‚¦12M+", v: [12_000_000, MAX_BUDGET] },
] as const;

export function WaitlistOnboarding({ embedded }: { embedded?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const createWaitingList = useStore((s) => s.createWaitingList);
  const role = useStore((s) => s.role);

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [city, setCity] = useState(params.get("city") ?? "Lagos");
  const [areas, setAreas] = useState<string[]>(params.get("area") ? [params.get("area")!] : []);
  const [type, setType] = useState<PropertyType | "Any">((params.get("type") as PropertyType) ?? "Apartment");
  const [budget, setBudget] = useState<[number, number]>([Number(params.get("min") ?? 2_000_000), Number(params.get("max") ?? 10_000_000)]);
  const [bedrooms, setBedrooms] = useState(Number(params.get("beds") ?? 2));
  const [moveIn, setMoveIn] = useState<WaitingList["moveIn"]>("Within 1 month");
  const [phase, setPhase] = useState<"form" | "matching" | "results">("form");
  const [saving, setSaving] = useState(false);

  const publicProperties = usePublicProperties();
  const prefs = { city, areas, propertyType: type, bedrooms, minBudget: budget[0], maxBudget: budget[1] };
  const matches = useMemo(
    () => topMatches(prefs, publicProperties, 6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [city, areas, type, bedrooms, budget, publicProperties]
  );

  const go = (d: 1 | -1) => {
    setDir(d);
    setStep((s) => s + d);
  };

  const finish = async () => {
    setPhase("matching");
    await sleep(1800);
    setPhase("results");
  };

  const save = async () => {
    if (role !== "tenant") {
      toast("Create a tenant account to save your waiting list");
      router.push(`/signup?role=tenant&next=${encodeURIComponent("/waiting-list")}`);
      return;
    }
    setSaving(true);
    await sleep(700);
    createWaitingList({ city, areas, propertyType: type, bedrooms, minBudget: budget[0], maxBudget: budget[1], moveIn });
    toast.success("Waiting list created", { description: "We'll alert you the moment a new verified match appears." });
    router.push("/tenant/waiting-list");
  };

  const canNext = step !== 0 || !!city;

  if (phase === "matching") {
    return (
      <div className="flex flex-col items-center py-20 text-center" aria-live="polite">
        <div className="relative flex size-28 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
          <span className="absolute inset-3 animate-pulse rounded-full bg-primary/20" />
          <span className="relative flex size-16 items-center justify-center rounded-full bg-primary text-white shadow-xl">
            <Sparkles className="size-7" />
          </span>
        </div>
        <h2 className="mt-8 text-2xl font-bold">Finding your matchesâ€¦</h2>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {[`Scanning verified homes in ${city}`, "Scoring against your budget & area", "Checking availability"].map((t, i) => (
            <motion.p key={t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.5 }} className="flex items-center justify-center gap-2">
              <Check className="size-4 text-success" /> {t}
            </motion.p>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "results") {
    return (
      <div>
        <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-br from-brand-50 to-emerald-50 p-6 dark:from-brand-900/40 dark:to-emerald-900/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Your preferences</p>
            <p className="mt-1 text-lg font-semibold">
              {type === "Any" ? "Any home" : type} Â· {bedrooms}+ bed Â· {areas.length ? areas.join(", ") : city}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatNaira(budget[0])} â€“ {budget[1] >= MAX_BUDGET ? "no max" : formatNaira(budget[1])} per year Â· Move in {moveIn.toLowerCase()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPhase("form")}>
              Edit
            </Button>
            <Button variant="success" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <HousePlus />} Save waiting list
            </Button>
          </div>
        </div>

        <h2 className="mt-8 text-xl font-semibold">
          {matches.length ? `${matches.length} verified homes match right now` : "No instant matches yet"}
        </h2>
        <p className="text-sm text-muted-foreground">Save your waiting list to get notified about new matches as soon as they&apos;re verified.</p>

        {matches.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={Sparkles}
            title="We'll keep looking for you"
            description="No current listing scores above 50%. Save your waiting list and you'll be first to know when one does."
            action={{ label: "Save waiting list", onClick: save }}
          />
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {matches.map(({ property: p, match }, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Link
                  href={`/properties/${p.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:flex-row"
                >
                  <div className="relative aspect-[16/10] sm:aspect-auto sm:w-44 sm:shrink-0">
                    <SafeImage src={p.images[0]} alt={p.title} fill sizes="200px" />
                    <VerificationBadge stage={p.verification} appearance="overlay" className="absolute left-2 top-2" />
                  </div>
                  <div className="flex-1 p-4">
                    <p className="line-clamp-1 font-semibold group-hover:text-primary">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.area}, {p.city} Â· {formatNairaCompact(p.rent)}/yr
                    </p>
                    <MatchScoreCard match={match} compact className="mt-3" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const current = STEPS[step];
  const cityAreas = areasFor(city);

  return (
    <div className={cn("mx-auto max-w-2xl", embedded && "max-w-none")}>
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={step}
          custom={dir}
          initial={{ opacity: 0, x: dir * 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -32 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <current.icon className="size-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{current.title}</h2>
              <p className="mt-1 text-muted-foreground">{current.subtitle}</p>
            </div>
          </div>

          <div className="mt-8">
            {step === 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CITIES.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      aria-pressed={city === c.name}
                      onClick={() => {
                        setCity(c.name);
                        setAreas([]);
                      }}
                      className={cn(
                        "relative overflow-hidden rounded-xl border p-3 text-left transition-all",
                        city === c.name ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/40"
                      )}
                    >
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.state} State</p>
                      {city === c.name && <Check className="absolute right-3 top-3 size-4 text-primary" />}
                    </button>
                  ))}
                </div>
                <div>
                  <p className="mb-3 text-sm font-medium">
                    Preferred areas in {city} <span className="font-normal text-muted-foreground">(select any)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cityAreas.map((a) => {
                      const on = areas.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setAreas((prev) => (on ? prev.filter((x) => x !== a) : [...prev, a]))}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-all",
                            on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40"
                          )}
                        >
                          {on && <Check className="size-3.5" />} {a}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {TYPE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={type === t.value}
                    onClick={() => setType(t.value)}
                    className={cn(
                      "flex flex-col items-start rounded-xl border p-4 text-left transition-all",
                      type === t.value ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <t.icon className={cn("size-6", type === t.value ? "text-primary" : "text-muted-foreground")} />
                    <p className="mt-3 text-sm font-semibold">{t.value === "Any" ? "Any type" : t.value}</p>
                    <p className="text-xs text-muted-foreground">{t.hint}</p>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="rounded-2xl border bg-card p-6 text-center">
                  <p className="text-sm text-muted-foreground">Annual budget</p>
                  <p className="mt-1 font-display text-3xl font-bold">
                    {formatNairaCompact(budget[0])} â€“ {budget[1] >= MAX_BUDGET ? `${formatNairaCompact(MAX_BUDGET)}+` : formatNairaCompact(budget[1])}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    â‰ˆ {formatNaira(Math.round(budget[0] / 12))} â€“ {formatNaira(Math.round(budget[1] / 12))} per month
                  </p>
                  <Slider
                    className="mt-6"
                    min={0}
                    max={MAX_BUDGET}
                    step={250_000}
                    value={budget}
                    onValueChange={(v) => setBudget([v[0], v[1]])}
                    thumbLabels={["Minimum budget", "Maximum budget"]}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {BUDGET_PRESETS.map((b) => {
                    const on = budget[0] === b.v[0] && budget[1] === b.v[1];
                    return (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => setBudget([b.v[0], b.v[1]])}
                        className={cn("rounded-full border px-3.5 py-2 text-sm transition-all", on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40")}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8">
                <div>
                  <p className="mb-3 text-sm font-medium">Minimum bedrooms</p>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={bedrooms === n}
                        onClick={() => setBedrooms(n)}
                        className={cn(
                          "flex flex-col items-center rounded-xl border py-4 transition-all",
                          bedrooms === n ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/40"
                        )}
                      >
                        <span className="font-display text-xl font-bold">{n === 5 ? "5+" : n}</span>
                        <span className="text-[11px] text-muted-foreground">bed{n > 1 && "s"}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-sm font-medium">When do you want to move in?</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {MOVE_IN.map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={moveIn === m}
                        onClick={() => setMoveIn(m)}
                        className={cn("rounded-xl border px-3 py-3 text-sm font-medium transition-all", moveIn === m ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20" : "hover:border-primary/40")}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 flex items-center justify-between border-t pt-6">
        <Button variant="ghost" onClick={() => go(-1)} disabled={step === 0}>
          <ArrowLeft /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => go(1)} disabled={!canNext}>
            Continue <ArrowRight />
          </Button>
        ) : (
          <Button variant="success" onClick={finish}>
            <Sparkles /> See my matches
          </Button>
        )}
      </div>
    </div>
  );
}


