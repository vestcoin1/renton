"use client";

import { useMemo, useState } from "react";
import { Ban, Check, Handshake, Loader2, Lock, TrendingUp, Users, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useLandlordData } from "renton-core/hooks";
import { useStore } from "renton-core/store";
import { canServeRentNotice, hasMovedIn, RENT_NOTICE_DAYS } from "renton-core/tenancy-rules";
import { Button } from "renton-ui/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "renton-ui/ui/dialog";
import { Input } from "renton-ui/ui/input";
import { Label } from "renton-ui/ui/label";
import { Textarea } from "renton-ui/ui/textarea";
import { cn, formatNaira, sleep } from "renton-core/utils";

/** One row per tenant the increase could apply to. */
interface Target {
  key: string;
  kind: "current" | "not_moved_in" | "new_applicant";
  leaseId?: string;
  propertyId: string;
  tenantName: string;
  label: string;
  currentRent: number;
  blocked?: string;
}

const round50k = (n: number) => Math.round(n / 50_000) * 50_000;

export function RentIncreaseDialog({ children, presetLeaseId }: { children: React.ReactNode; presetLeaseId?: string }) {
  const { leases, invoices, applications, byId, usersById } = useLandlordData();
  const serve = useStore((s) => s.serveRentIncrease);
  const applyNew = useStore((s) => s.applyRentToNewTenants);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"one" | "all">(presetLeaseId ? "one" : "all");
  const [selected, setSelected] = useState(presetLeaseId ?? "");
  const [percent, setPercent] = useState("10");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const targets = useMemo<Target[]>(() => {
    const out: Target[] = [];
    for (const l of leases) {
      if (l.status === "ended") continue;
      const p = byId.get(l.propertyId);
      const movedIn = hasMovedIn(l);
      const notice = canServeRentNotice(l);
      const inProgress = l.rentReview && (l.rentReview.status === "proposed" || l.rentReview.status === "countered");
      out.push({
        key: `lease:${l.id}`,
        kind: movedIn ? "current" : "not_moved_in",
        leaseId: l.id,
        propertyId: l.propertyId,
        tenantName: usersById.get(l.tenantId)?.name ?? "Tenant",
        label: `${l.unit} Â· ${p?.area}`,
        currentRent: l.annualRent,
        blocked: inProgress ? "A rent review is already in progress" : movedIn && !notice.ok ? notice.reason : undefined,
      });
    }
    for (const i of invoices) {
      if (i.status !== "awaiting_payment" && i.status !== "rejected") continue;
      const p = byId.get(i.propertyId);
      const app = applications.find((a) => a.id === i.applicationId);
      out.push({
        key: `invoice:${i.id}`,
        kind: "new_applicant",
        propertyId: i.propertyId,
        tenantName: usersById.get(i.tenantId)?.name ?? "Tenant",
        label: `${p?.title} Â· approved, payment pending`,
        currentRent: p?.rent ?? 0,
        ...(app ? {} : { blocked: "Application not found" }),
      });
    }
    return out;
  }, [leases, invoices, applications, byId, usersById]);

  const chosen = scope === "all" ? targets : targets.filter((t) => t.key === selected || t.leaseId === selected);
  const pctNum = Number(percent) || 0;
  const amountNum = Number(amount.replace(/\D/g, "") || 0);
  const newRentFor = (t: Target) => (scope === "one" && amountNum ? amountNum : round50k(t.currentRent * (1 + pctNum / 100)));
  const actionable = chosen.filter((t) => !t.blocked && newRentFor(t) > t.currentRent);

  const submit = async () => {
    setBusy(true);
    await sleep(800);
    const leaseTargets = actionable.filter((t) => t.leaseId).map((t) => ({ leaseId: t.leaseId!, newRent: newRentFor(t) }));
    const { served, skipped } = leaseTargets.length ? serve(leaseTargets, note.trim() || undefined) : { served: [], skipped: [] };
    const newTenantProps = new Map(actionable.filter((t) => t.kind === "new_applicant").map((t) => [t.propertyId, newRentFor(t)]));
    let invoicesUpdated = 0;
    newTenantProps.forEach((rent, pid) => (invoicesUpdated += applyNew(pid, rent)));
    setBusy(false);
    setOpen(false);
    toast.success("Rent increase sent", {
      description: [
        served.length && `${served.length} tenant${served.length > 1 ? "s" : ""} notified`,
        invoicesUpdated && `${invoicesUpdated} new tenant invoice${invoicesUpdated > 1 ? "s" : ""} updated`,
        skipped.length && `${skipped.length} skipped`,
      ]
        .filter(Boolean)
        .join(" Â· "),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Increase rent</DialogTitle>
          <DialogDescription>
            Current tenants must get at least 3 months&apos; notice ({RENT_NOTICE_DAYS} days) before their tenancy ends, and can negotiate. Tenants who haven&apos;t moved in pay the new rent in full.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who to apply the increase to">
          {(
            [
              ["one", UserRound, "A specific tenant"],
              ["all", Users, "All tenants"],
            ] as const
          ).map(([v, Icon, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={scope === v}
              onClick={() => setScope(v)}
              className={cn("flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all", scope === v ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/40")}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        {scope === "one" ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
            <div className="grid gap-1.5">
              <Label htmlFor="ri-tenant">Tenant</Label>
              <select
                id="ri-tenant"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="">Choose a tenantâ€¦</option>
                {targets.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.tenantName} Â· {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ri-amount">New annual rent</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">â‚¦</span>
                <Input id="ri-amount" inputMode="numeric" className="pl-7" value={amountNum ? amountNum.toLocaleString("en-NG") : ""} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 9,350,000" />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-1.5 sm:max-w-xs">
            <Label htmlFor="ri-pct">Increase by (%)</Label>
            <Input id="ri-pct" type="number" min={1} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} />
            <p className="text-xs text-muted-foreground">New rents are rounded to the nearest â‚¦50,000.</p>
          </div>
        )}

        {chosen.length > 0 && (
          <ul className="max-h-64 divide-y overflow-y-auto rounded-xl border">
            {chosen.map((t) => {
              const next = newRentFor(t);
              const ok = !t.blocked && next > t.currentRent;
              return (
                <li key={t.key} className={cn("flex flex-col gap-1.5 p-3 text-sm sm:flex-row sm:items-center sm:gap-3", !ok && "bg-muted/40")}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.tenantName}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.label}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatNaira(t.currentRent)} â†’ <span className="font-semibold text-foreground">{formatNaira(next)}</span>
                    </span>
                    {t.blocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                        <Ban className="size-3" /> {t.blocked}
                      </span>
                    ) : t.kind === "current" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <Handshake className="size-3" /> Negotiable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        <Lock className="size-3" /> Not moved in Â· pays full rent
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="ri-note">Message to tenants (optional)</Label>
          <Textarea id="ri-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain the reason for the increase" />
        </div>

        <DialogFooter className="items-center">
          <p className="mr-auto text-xs text-muted-foreground">
            {actionable.length} of {chosen.length} will be updated
          </p>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!actionable.length || busy} onClick={submit}>
            {busy ? <Loader2 className="animate-spin" /> : <TrendingUp />} Send rent increase
          </Button>
        </DialogFooter>
        <p className="-mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Check className="size-3" /> For approved applicants who haven&apos;t paid yet, the listing price is updated too, so future applicants pay the new rent.
        </p>
      </DialogContent>
    </Dialog>
  );
}


