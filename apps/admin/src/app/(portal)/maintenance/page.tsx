"use client";

import { useState } from "react";
import { BellRing, CircleCheck, Hourglass, Loader2, Search, Send, Star, Truck, Wrench } from "lucide-react";
import { toast } from "sonner";
import type { MaintenanceCategory, MaintenanceRequest, MaintenanceStatus } from "renton-shared/types";
import { useStore } from "renton-core/store";
import { useTechnicians } from "renton-core/hooks";
import { PageHeader, StatCard } from "renton-ui/dashboard/widgets";
import { EmptyState } from "renton-ui/shared/states";
import { MaintenanceRequestCard } from "renton-ui/maintenance/request-card";
import { MaintenanceDetailSheet } from "renton-ui/maintenance/request-detail-sheet";
import { Button } from "renton-ui/ui/button";
import { Input } from "renton-ui/ui/input";
import { Label } from "renton-ui/ui/label";
import { Tabs, TabsList, TabsTrigger } from "renton-ui/ui/tabs";
import { Textarea } from "renton-ui/ui/textarea";
import { cn, sleep } from "renton-core/utils";

const TABS: { value: string; label: string; statuses: MaintenanceStatus[] }[] = [
  { value: "new", label: "New", statuses: ["submitted"] },
  { value: "investigating", label: "Investigating", statuses: ["investigating"] },
  { value: "landlord", label: "With landlord", statuses: ["awaiting_approval"] },
  { value: "dispatch", label: "Ready to dispatch", statuses: ["approved"] },
  { value: "progress", label: "In progress", statuses: ["in_progress"] },
  { value: "closed", label: "Closed", statuses: ["completed", "declined"] },
];

/** Suggests the right trade for each category when dispatching. */
const TRADE_FOR: Record<MaintenanceCategory, string> = {
  Plumbing: "tech-1",
  Electrical: "tech-2",
  "Power / Generator": "tech-4",
  "Air Conditioning": "tech-3",
  "Roof / Leak": "tech-6",
  "Doors & Security": "tech-5",
  Appliances: "tech-2",
  "Pest Control": "tech-5",
  Other: "tech-5",
};

const URGENCY_RANK = { emergency: 0, high: 1, medium: 2, low: 3 };

function defaultVisit() {
  const d = new Date(Date.now() + 86400000);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
}

function AdminActions({ r, onDone }: { r: MaintenanceRequest; onDone: () => void }) {
  const start = useStore((s) => s.startInvestigation);
  const report = useStore((s) => s.sendInvestigationReport);
  const dispatch = useStore((s) => s.dispatchTechnician);
  const complete = useStore((s) => s.completeMaintenance);
  const technicians = useTechnicians();
  const [findings, setFindings] = useState("");
  const [fix, setFix] = useState("");
  const [cost, setCost] = useState("");
  const [tech, setTech] = useState(TRADE_FOR[r.category]);
  const [when, setWhen] = useState(defaultVisit);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => void, msg: string) => {
    setBusy(true);
    await sleep(600);
    fn();
    setBusy(false);
    toast.success(msg);
  };

  if (r.status === "submitted")
    return (
      <Button className="w-full" disabled={busy} onClick={() => run(() => start(r.id), "Investigation started Â· tenant notified")}>
        {busy ? <Loader2 className="animate-spin" /> : <Search />} Start investigation
      </Button>
    );

  if (r.status === "investigating") {
    const amount = Number(cost.replace(/\D/g, ""));
    const valid = findings.trim().length > 10 && fix.trim().length > 5 && amount > 0;
    return (
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          run(() => report(r.id, { findings: findings.trim(), recommendedFix: fix.trim(), estimatedCost: amount }), "Report sent to landlord for approval");
        }}
      >
        <p className="text-sm font-semibold">Investigation report for the landlord</p>
        <Textarea rows={2} value={findings} onChange={(e) => setFindings(e.target.value)} placeholder="Findings: what's wrong and why" aria-label="Findings" />
        <Textarea rows={2} value={fix} onChange={(e) => setFix(e.target.value)} placeholder="Recommended fix" aria-label="Recommended fix" />
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">â‚¦</span>
          <Input
            inputMode="numeric"
            className="pl-7"
            value={cost ? Number(cost.replace(/\D/g, "") || 0).toLocaleString("en-NG") : ""}
            onChange={(e) => setCost(e.target.value)}
            placeholder="Estimated cost"
            aria-label="Estimated cost"
          />
        </div>
        <Button type="submit" className="w-full" disabled={!valid || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Send />} Send report to landlord
        </Button>
      </form>
    );
  }

  if (r.status === "awaiting_approval")
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
          <Hourglass className="size-4" /> Waiting for the landlord to approve.
        </p>
        <Button variant="outline" onClick={() => toast.success("Reminder sent to landlord")}>
          <BellRing /> Send reminder
        </Button>
      </div>
    );

  if (r.status === "approved")
    return (
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => dispatch(r.id, tech, new Date(when).toISOString()), "Technician dispatched Â· tenant & landlord notified");
        }}
      >
        <p className="text-sm font-semibold">Dispatch a technician</p>
        <div role="radiogroup" aria-label="Technician" className="grid max-h-44 gap-1.5 overflow-y-auto">
          {technicians.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={tech === t.id}
              onClick={() => setTech(t.id)}
              className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all", tech === t.id ? "border-primary bg-primary/5" : "hover:border-primary/40")}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {t.name} {t.id === TRADE_FOR[r.category] && <span className="ml-1 rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Suggested</span>}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t.trade} Â· {t.company}
                </span>
              </span>
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Star className="size-3 fill-amber-400 text-amber-400" /> {t.rating}
              </span>
            </button>
          ))}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="visit">Visit date &amp; time</Label>
          <Input id="visit" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Truck />} Dispatch technician
        </Button>
      </form>
    );

  if (r.status === "in_progress")
    return (
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (note.trim().length < 5) return;
          run(() => {
            complete(r.id, note.trim());
            onDone();
          }, "Marked as completed Â· tenant asked to rate");
        }}
      >
        <p className="text-sm font-semibold">Close the job</p>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did the technician do?" aria-label="Completion note" />
        <Button type="submit" variant="success" className="w-full" disabled={note.trim().length < 5 || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <CircleCheck />} Mark as completed
        </Button>
      </form>
    );

  return null;
}

export default function AdminMaintenancePage() {
  const maintenance = useStore((s) => s.maintenance);
  const properties = useStore((s) => s.properties);
  const users = useStore((s) => s.users);
  const [tab, setTab] = useState("new");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const byId = new Map(properties.map((p) => [p.id, p]));
  const usersById = new Map(users.map((u) => [u.id, u]));
  const selected = maintenance.find((m) => m.id === selectedId) ?? null;
  const current = TABS.find((t) => t.value === tab)!;
  const list = maintenance
    .filter((m) => current.statuses.includes(m.status))
    .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const count = (st: MaintenanceStatus[]) => maintenance.filter((m) => st.includes(m.status)).length;

  return (
    <>
      <PageHeader title="Maintenance desk" description="Investigate tenant repair requests, report to landlords, and dispatch vetted technicians." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Need investigation" value={count(["submitted", "investigating"])} icon={Search} tone="violet" />
        <StatCard index={1} label="Awaiting landlord" value={count(["awaiting_approval"])} icon={Hourglass} tone="amber" />
        <StatCard index={2} label="Ready to dispatch" value={count(["approved"])} icon={Truck} tone="blue" />
        <StatCard index={3} label="Completed" value={count(["completed"])} icon={Wrench} tone="emerald" />
      </div>
      <Tabs value={tab} onValueChange={setTab} className="mb-5">
        <TabsList className="h-auto flex-wrap justify-start">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label} <span className="text-[11px] text-muted-foreground">{count(t.statuses)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {list.length === 0 ? (
        <EmptyState icon={Wrench} title="Nothing here" description="Requests will appear in this column as they move through the pipeline." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((m) => (
            <MaintenanceRequestCard key={m.id} request={m} property={byId.get(m.propertyId)} tenant={usersById.get(m.tenantId)} perspective="admin" onOpen={() => setSelectedId(m.id)} />
          ))}
        </div>
      )}
      <MaintenanceDetailSheet
        request={selected}
        property={selected ? byId.get(selected.propertyId) : undefined}
        tenant={selected ? usersById.get(selected.tenantId) : undefined}
        perspective="admin"
        onClose={() => setSelectedId(null)}
        actions={selected ? <AdminActions key={selected.id + selected.status} r={selected} onDone={() => setSelectedId(null)} /> : undefined}
      />
    </>
  );
}


