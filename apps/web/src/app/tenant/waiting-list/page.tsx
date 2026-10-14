"use client";

import { useState } from "react";
import { ListPlus, ListChecks, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { PropertyType, WaitingList } from "@/types";
import { useTenantData } from "renton-core/hooks";
import { useStore } from "renton-core/store";
import { CITIES, PROPERTY_TYPES, BUDGET_RANGES, areasFor } from "renton-shared/reference";
import { PageHeader } from "renton-ui/dashboard/widgets";
import { WaitingListCard } from "@/components/waitlist/waiting-list-card";
import { EmptyState } from "renton-ui/shared/states";
import { Button } from "renton-ui/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "renton-ui/ui/dialog";
import { Label } from "renton-ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "renton-ui/ui/select";
import { sleep } from "renton-core/utils";
import Link from "next/link";

function CreateWaitingListDialog() {
  const create = useStore((s) => s.createWaitingList);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [city, setCity] = useState("Lagos");
  const [area, setArea] = useState("any");
  const [budget, setBudget] = useState(BUDGET_RANGES[2].label);
  const [type, setType] = useState<PropertyType | "Any">("Apartment");
  const [beds, setBeds] = useState("2");
  const [moveIn, setMoveIn] = useState<WaitingList["moveIn"]>("Within 1 month");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await sleep(700);
    const range = BUDGET_RANGES.find((b) => b.label === budget)!;
    create({ city, areas: area === "any" ? [] : [area], propertyType: type, bedrooms: Number(beds), minBudget: range.min, maxBudget: range.max, moveIn });
    setSaving(false);
    setOpen(false);
    toast.success("Waiting list created", { description: "We'll alert you when new matches are verified." });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <ListPlus /> Create waiting list
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Create a waiting list</DialogTitle>
            <DialogDescription>Tell us what you&apos;re looking for. We&apos;ll match you with new verified homes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>City</Label>
              <Select
                value={city}
                onValueChange={(v) => {
                  setCity(v);
                  setArea("any");
                }}
              >
                <SelectTrigger aria-label="City">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Preferred location</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger aria-label="Preferred area">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Anywhere in {city}</SelectItem>
                  {areasFor(city).map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Budget (per year)</Label>
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger aria-label="Budget">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGES.map((b) => (
                    <SelectItem key={b.label} value={b.label}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Property type</Label>
              <Select value={type} onValueChange={(v) => setType(v as PropertyType | "Any")}>
                <SelectTrigger aria-label="Property type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Any">Any type</SelectItem>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Bedrooms</Label>
              <Select value={beds} onValueChange={setBeds}>
                <SelectTrigger aria-label="Bedrooms">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}+ bedroom{n > 1 && "s"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Move-in</Label>
              <Select value={moveIn} onValueChange={(v) => setMoveIn(v as WaitingList["moveIn"])}>
                <SelectTrigger aria-label="Move-in timing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["Immediately", "Within 1 month", "1-3 months", "Flexible"] as const).map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Create waiting list
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TenantWaitingListPage() {
  const { waitingLists, publicProperties } = useTenantData();
  return (
    <>
      <PageHeader
        title="Waiting lists"
        description="We score every newly verified home against your lists and alert you to strong matches."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/waiting-list">
                <Sparkles /> Guided matching
              </Link>
            </Button>
            <CreateWaitingListDialog />
          </>
        }
      />
      {waitingLists.length === 0 ? (
        <EmptyState icon={ListChecks} title="No waiting lists yet" description="Create one and we'll match you with verified homes, often before they're public." action={{ label: "Start guided matching", href: "/waiting-list" }} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {waitingLists.map((w) => (
            <WaitingListCard key={w.id} list={w} properties={publicProperties} />
          ))}
        </div>
      )}
    </>
  );
}


