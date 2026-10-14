"use client";

import { useState, type ReactNode } from "react";
import { BadgeCheck, CircleCheck, Hourglass, Landmark, Loader2, PiggyBank, ReceiptText, X } from "lucide-react";
import { toast } from "sonner";
import type { RentContribution, RentPlan } from "renton-shared/types";
import { useStore } from "renton-core/store";
import { rentPlanProgress } from "renton-core/tenancy-rules";
import { PageHeader, StatCard, UserAvatar } from "renton-ui/dashboard/widgets";
import { EmptyState } from "renton-ui/shared/states";
import { SafeImage } from "renton-ui/shared/safe-image";
import { ReceiptPreview } from "renton-ui/payments/payment-parts";
import { CONTRIBUTION_STATUS, RentPlanBar, SCHEDULE_LABEL } from "renton-ui/payments/rent-plan";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card } from "renton-ui/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "renton-ui/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "renton-ui/ui/tabs";
import { Textarea } from "renton-ui/ui/textarea";
import { cn, formatDate, formatNaira, sleep, timeAgo } from "renton-core/utils";

type Tab = "verify" | "payout" | "saving" | "paid";

const REJECT_REASONS = [
  "We couldn't find this transfer in our account.",
  "The amount on the receipt doesn't match what you entered.",
  "The receipt is unclear or incomplete.",
  "The payment reference doesn't match your rent plan.",
];

function ContributionActions({ plan, c, onDone }: { plan: RentPlan; c: RentContribution; onDone: () => void }) {
  const verify = useStore((s) => s.verifyRentContribution);
  const reject = useStore((s) => s.rejectRentContribution);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (rejecting)
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {REJECT_REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)} className={cn("rounded-full border px-2.5 py-1 text-xs", reason === r ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40")}>
              {r}
            </button>
          ))}
        </div>
        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason shared with the tenant" aria-label="Rejection reason" />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setRejecting(false)}>
            Back
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            onClick={() => {
              reject(plan.id, c.id, reason.trim());
              toast("Installment rejected", { description: "The tenant has been told why." });
              onDone();
            }}
          >
            <X /> Reject installment
          </Button>
        </div>
      </div>
    );

  return (
    <div className="space-y-2">
      <Button
        variant="success"
        className="w-full"
        size="lg"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await sleep(700);
          verify(plan.id, c.id);
          setBusy(false);
          toast.success("Installment confirmed", { description: `${formatNaira(c.amount)} added to the tenant's rent.` });
          onDone();
        }}
      >
        {busy ? <Loader2 className="animate-spin" /> : <BadgeCheck />} Confirm {formatNaira(c.amount)} received
      </Button>
      <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setRejecting(true)}>
        <X /> Reject
      </Button>
    </div>
  );
}

function PayoutButton({ plan, amount }: { plan: RentPlan; amount: number }) {
  const payOut = useStore((s) => s.payOutRentPlan);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="success"
      className="w-full"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await sleep(900);
        const ok = payOut(plan.id);
        setBusy(false);
        if (ok) toast.success("Landlord paid", { description: `${formatNaira(amount)} sent. Landlord and tenant notified.` });
        else toast.error("This rent isn't fully paid yet");
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <Landmark />} Pay landlord {formatNaira(amount)}
    </Button>
  );
}

export default function AdminRentPage() {
  const plans = useStore((s) => s.rentPlans);
  const leases = useStore((s) => s.leases);
  const properties = useStore((s) => s.properties);
  const users = useStore((s) => s.users);
  const [tab, setTab] = useState<Tab>("verify");
  const [open, setOpen] = useState<{ planId: string; contributionId?: string } | null>(null);

  const propById = new Map(properties.map((p) => [p.id, p]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const leaseById = new Map(leases.map((l) => [l.id, l]));
  const rows = plans
    .map((plan) => {
      const lease = leaseById.get(plan.leaseId);
      return lease ? { plan, lease, progress: rentPlanProgress(plan, lease) } : null;
    })
    .filter((r): r is NonNullable<typeof r> => !!r);

  const toVerify = rows.flatMap((r) => r.plan.contributions.filter((c) => c.status === "submitted").map((c) => ({ ...r, c })));
  const readyForPayout = rows.filter((r) => r.plan.status === "saving" && r.progress.funded);
  const saving = rows.filter((r) => r.plan.status === "saving" && !r.progress.funded);
  const paid = rows.filter((r) => r.plan.status === "paid_out");
  const held = rows.filter((r) => r.plan.status === "saving").reduce((n, r) => n + r.progress.saved, 0);

  const selected = open ? rows.find((r) => r.plan.id === open.planId) : undefined;
  const selectedC = selected && open?.contributionId ? selected.plan.contributions.find((c) => c.id === open.contributionId) : undefined;
  const sp = selected ? propById.get(selected.plan.propertyId) : undefined;
  const st = selected ? userById.get(selected.plan.tenantId) : undefined;
  const sl = sp ? userById.get(sp.landlordId) : undefined;

  const TABS: { value: Tab; label: string; count: number }[] = [
    { value: "verify", label: "To verify", count: toVerify.length },
    { value: "payout", label: "Ready to pay landlord", count: readyForPayout.length },
    { value: "saving", label: "Still paying", count: saving.length },
    { value: "paid", label: "Paid out", count: paid.length },
  ];

  const planCard = (r: (typeof rows)[number], extra?: ReactNode) => {
    const p = propById.get(r.plan.propertyId);
    const t = userById.get(r.plan.tenantId);
    return (
      <Card
        key={r.plan.id}
        role="button"
        tabIndex={0}
        onClick={() => setOpen({ planId: r.plan.id })}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen({ planId: r.plan.id })}
        className="group flex cursor-pointer flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
      >
        <div className="flex gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">{p && <SafeImage src={p.images[0]} alt="" fill sizes="64px" />}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-semibold group-hover:text-primary">{t?.name}</p>
              <Badge variant="neutral">{SCHEDULE_LABEL[r.plan.schedule]}</Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {p?.title} Â· {p?.area}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ref {r.plan.reference} Â· term from {formatDate(r.plan.dueDate)}
            </p>
          </div>
        </div>
        <RentPlanBar progress={r.progress} />
        {extra}
      </Card>
    );
  };

  return (
    <>
      <PageHeader title="Rent installments" description="Tenants pay rent to renton in installments. Confirm each transfer, then pay the landlord once the rent is complete." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Installments to verify" value={toVerify.length} icon={ReceiptText} tone="blue" />
        <StatCard index={1} label="Ready to pay landlord" value={readyForPayout.length} icon={Landmark} tone="emerald" />
        <StatCard index={2} label="Tenants still paying" value={saving.length} icon={Hourglass} tone="amber" />
        <StatCard index={3} label="Held for landlords" value={formatNaira(held)} icon={PiggyBank} tone="violet" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-5">
        <TabsList className="h-auto flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label} <span className="text-[11px] text-muted-foreground">{t.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === "verify" &&
        (toVerify.length === 0 ? (
          <EmptyState icon={ReceiptText} title="Nothing to verify" description="Installments appear here when tenants upload a transfer receipt." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {toVerify.map(({ plan, c }) => {
              const p = propById.get(plan.propertyId);
              const t = userById.get(plan.tenantId);
              return (
                <Card
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpen({ planId: plan.id, contributionId: c.id })}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen({ planId: plan.id, contributionId: c.id })}
                  className="group flex cursor-pointer gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
                >
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">{p && <SafeImage src={p.images[0]} alt="" fill sizes="80px" />}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-semibold group-hover:text-primary">{t?.name}</p>
                      <Badge variant="info">Installment</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {p?.title} Â· {p?.area}
                    </p>
                    <p className="mt-2 font-display text-lg font-bold">{formatNaira(c.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      Ref {plan.reference} Â· receipt {timeAgo(c.receipt.uploadedAt)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}

      {tab === "payout" &&
        (readyForPayout.length === 0 ? (
          <EmptyState icon={Landmark} title="No payouts due" description="When a tenant's installments add up to the full rent, the landlord payout appears here." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {readyForPayout.map((r) =>
              planCard(
                r,
                <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                  <PayoutButton plan={r.plan} amount={r.progress.target} />
                </div>
              )
            )}
          </div>
        ))}

      {tab === "saving" &&
        (saving.length === 0 ? (
          <EmptyState icon={Hourglass} title="No open plans" description="Tenants paying rent in installments appear here." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {saving.map((r) =>
              planCard(
                r,
                <p className="text-xs text-muted-foreground">
                  {formatNaira(r.progress.remaining)} left Â· due {formatDate(r.plan.dueDate)}
                </p>
              )
            )}
          </div>
        ))}

      {tab === "paid" &&
        (paid.length === 0 ? (
          <EmptyState icon={CircleCheck} title="No payouts yet" description="Completed landlord payouts appear here." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {paid.map((r) =>
              planCard(
                r,
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CircleCheck className="size-3.5 text-success" /> Paid {formatNaira(r.plan.payout!.amount)} on {formatDate(r.plan.payout!.at)} Â· {r.plan.payout!.reference}
                </p>
              )
            )}
          </div>
        ))}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="gap-0 p-0 sm:max-w-xl">
          {selected && sp && st && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{SCHEDULE_LABEL[selected.plan.schedule]}</Badge>
                  <span className="text-xs text-muted-foreground">Ref {selected.plan.reference}</span>
                </div>
                <SheetTitle className="pt-1">{selectedC ? `${formatNaira(selectedC.amount)} installment` : `Rent for term from ${formatDate(selected.plan.dueDate)}`}</SheetTitle>
                <SheetDescription>
                  {sp.title} Â· {sp.area}, {sp.city}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto p-6">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-xl border p-3">
                    <UserAvatar name={st.name} hue={st.avatarHue} />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Tenant</p>
                      <p className="truncate font-medium">{st.name}</p>
                    </div>
                  </div>
                  {sl && (
                    <div className="flex items-center gap-3 rounded-xl border p-3">
                      <UserAvatar name={sl.name} hue={sl.avatarHue} />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Landlord (payee)</p>
                        <p className="truncate font-medium">{sl.name}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold">
                    {formatNaira(selected.progress.saved)} of {formatNaira(selected.progress.target)} paid
                  </p>
                  <RentPlanBar progress={selected.progress} />
                </div>

                {selectedC && (
                  <div>
                    <p className="mb-2 text-sm font-semibold">Uploaded receipt</p>
                    <dl className="mb-3 grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-lg bg-muted/60 p-2.5">
                        <dt className="text-xs text-muted-foreground">Amount</dt>
                        <dd className="font-semibold">{formatNaira(selectedC.amount)}</dd>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-2.5">
                        <dt className="text-xs text-muted-foreground">Date paid</dt>
                        <dd className="font-semibold">{formatDate(selectedC.receipt.paidOn)}</dd>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-2.5">
                        <dt className="text-xs text-muted-foreground">From</dt>
                        <dd className="truncate font-semibold">{selectedC.receipt.payerBank}</dd>
                      </div>
                    </dl>
                    <ReceiptPreview receipt={selectedC.receipt} />
                    <p className="mt-2 text-xs text-muted-foreground">Check the bank statement for a credit matching the amount and reference before confirming.</p>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-semibold">All installments</p>
                  {selected.plan.contributions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payments yet.</p>
                  ) : (
                    <ul className="divide-y rounded-xl border">
                      {[...selected.plan.contributions].reverse().map((c) => (
                        <li key={c.id} className={cn("flex items-center justify-between gap-3 p-3", c.id === selectedC?.id && "bg-primary/5")}>
                          <div>
                            <p className="font-medium tabular-nums">{formatNaira(c.amount)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(c.receipt.paidOn)} Â· {c.receipt.payerBank}
                            </p>
                          </div>
                          <Badge variant={CONTRIBUTION_STATUS[c.status].variant}>{CONTRIBUTION_STATUS[c.status].label}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {selected.plan.payout && (
                  <p className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-3 text-sm">
                    <CircleCheck className="size-4 text-success" /> Paid to landlord by {selected.plan.payout.by} on {formatDate(selected.plan.payout.at)} Â· {selected.plan.payout.reference}
                  </p>
                )}
              </div>
              {selectedC?.status === "submitted" ? (
                <div className="border-t bg-subtle p-4">
                  <ContributionActions key={selectedC.id} plan={selected.plan} c={selectedC} onDone={() => setOpen(null)} />
                </div>
              ) : (
                selected.plan.status === "saving" &&
                selected.progress.funded && (
                  <div className="border-t bg-subtle p-4">
                    <PayoutButton plan={selected.plan} amount={selected.progress.target} />
                  </div>
                )
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}


