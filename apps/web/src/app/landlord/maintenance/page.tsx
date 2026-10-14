"use client";

import { useState } from "react";
import { Check, Loader2, ShieldCheck, Wallet, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import type { MaintenanceRequest } from "@/types";
import { useLandlordData } from "renton-core/hooks";
import { useStore } from "renton-core/store";
import { PageHeader, StatCard } from "renton-ui/dashboard/widgets";
import { EmptyState } from "renton-ui/shared/states";
import { MaintenanceRequestCard } from "renton-ui/maintenance/request-card";
import { MaintenanceDetailSheet } from "renton-ui/maintenance/request-detail-sheet";
import { OPEN_STATUSES } from "renton-ui/maintenance/meta";
import { Button } from "renton-ui/ui/button";
import { Tabs, TabsList, TabsTrigger } from "renton-ui/ui/tabs";
import { Textarea } from "renton-ui/ui/textarea";
import { formatNaira, sleep } from "renton-core/utils";

function ApprovalActions({ r, onDone }: { r: MaintenanceRequest; onDone: () => void }) {
  const decide = useStore((s) => s.decideMaintenance);
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);

  const act = async (approved: boolean) => {
    setBusy(approved ? "approve" : "decline");
    await sleep(600);
    decide(r.id, approved, note.trim() || undefined);
    setBusy(null);
    toast.success(approved ? "Repair approved" : "Repair declined", {
      description: approved ? "renton will dispatch a technician and keep you updated." : "The tenant and renton have been notified.",
    });
    onDone();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border bg-card p-3">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wallet className="size-4" /> Estimated cost
        </span>
        <span className="font-display text-lg font-bold">{formatNaira(r.investigation?.estimatedCost ?? 0)}</span>
      </div>
      {declining && (
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why are you declining? (shared with tenant and renton)" aria-label="Reason for declining" autoFocus />
      )}
      {!declining && <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note to renton / tenant" aria-label="Note" />}
      <div className="grid grid-cols-2 gap-2">
        {declining ? (
          <>
            <Button variant="outline" onClick={() => setDeclining(false)}>
              Back
            </Button>
            <Button variant="destructive" disabled={!note.trim() || !!busy} onClick={() => act(false)}>
              {busy === "decline" ? <Loader2 className="animate-spin" /> : <X />} Confirm decline
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeclining(true)}>
              <X /> Decline
            </Button>
            <Button variant="success" disabled={!!busy} onClick={() => act(true)}>
              {busy === "approve" ? <Loader2 className="animate-spin" /> : <Check />} Approve repair
            </Button>
          </>
        )}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-success" /> Work is carried out by a vetted renton technician.
      </p>
    </div>
  );
}

export default function LandlordMaintenancePage() {
  const { maintenance, byId, usersById } = useLandlordData();
  const [tab, setTab] = useState<"approval" | "open" | "closed">("approval");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = maintenance.find((m) => m.id === selectedId) ?? null;

  const groups = {
    approval: maintenance.filter((m) => m.status === "awaiting_approval"),
    open: maintenance.filter((m) => OPEN_STATUSES.includes(m.status) && m.status !== "awaiting_approval"),
    closed: maintenance.filter((m) => !OPEN_STATUSES.includes(m.status)),
  };
  const list = [...groups[tab]].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const spent = maintenance.filter((m) => m.status === "completed").reduce((n, m) => n + (m.investigation?.estimatedCost ?? 0), 0);

  return (
    <>
      <PageHeader title="Maintenance" description="renton investigates every tenant request and sends you a report. Approve it, and we'll dispatch a technician." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Needs your approval" value={groups.approval.length} icon={ShieldCheck} tone="amber" />
        <StatCard index={1} label="In progress" value={groups.open.length} icon={Wrench} tone="blue" />
        <StatCard index={2} label="Completed" value={maintenance.filter((m) => m.status === "completed").length} icon={Check} tone="emerald" />
        <StatCard index={3} label="Repair spend (YTD)" value={formatNaira(spent)} icon={Wallet} tone="slate" />
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-5">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="approval">
            Needs approval <span className="text-[11px] text-muted-foreground">{groups.approval.length}</span>
          </TabsTrigger>
          <TabsTrigger value="open">
            In progress <span className="text-[11px] text-muted-foreground">{groups.open.length}</span>
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed <span className="text-[11px] text-muted-foreground">{groups.closed.length}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {list.length === 0 ? (
        <EmptyState icon={Wrench} title={tab === "approval" ? "Nothing to approve" : "No requests here"} description="You'll be notified as soon as renton finishes investigating a tenant's request." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((m) => (
            <MaintenanceRequestCard
              key={m.id}
              request={m}
              property={byId.get(m.propertyId)}
              tenant={usersById.get(m.tenantId)}
              perspective="landlord"
              highlight={m.status === "awaiting_approval"}
              onOpen={() => setSelectedId(m.id)}
            />
          ))}
        </div>
      )}
      <MaintenanceDetailSheet
        request={selected}
        property={selected ? byId.get(selected.propertyId) : undefined}
        tenant={selected ? usersById.get(selected.tenantId) : undefined}
        perspective="landlord"
        onClose={() => setSelectedId(null)}
        actions={selected?.status === "awaiting_approval" ? <ApprovalActions key={selected.id} r={selected} onDone={() => setSelectedId(null)} /> : undefined}
      />
    </>
  );
}


