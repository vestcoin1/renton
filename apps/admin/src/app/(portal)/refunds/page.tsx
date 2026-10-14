"use client";

import { useState } from "react";
import { Banknote, CalendarClock, CircleCheck, Hourglass, Landmark, Loader2, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import type { CautionRefund } from "renton-shared/types";
import { useStore } from "renton-core/store";
import { daysUntil, isRefundEligible, REFUND_WAIT_DAYS } from "renton-core/tenancy-rules";
import { PageHeader, StatCard, UserAvatar } from "renton-ui/dashboard/widgets";
import { EmptyState } from "renton-ui/shared/states";
import { REFUND_STATUS } from "renton-ui/tenancy/caution-refund";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card } from "renton-ui/ui/card";
import { Input } from "renton-ui/ui/input";
import { Label } from "renton-ui/ui/label";
import { Tabs, TabsList, TabsTrigger } from "renton-ui/ui/tabs";
import { formatDate, formatNaira, sleep } from "renton-core/utils";

function RefundActions({ r }: { r: CautionRefund }) {
  const approve = useStore((s) => s.approveCautionRefund);
  const pay = useStore((s) => s.markRefundPaid);
  const [deduct, setDeduct] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const eligible = isRefundEligible(r.eligibleFrom);
  const deduction = Number(deduct.replace(/\D/g, "") || 0);

  if (r.status === "requested" && !eligible)
    return (
      <p className="flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
        <Lock className="size-4 shrink-0" /> Locked until {formatDate(r.eligibleFrom)} ({daysUntil(r.eligibleFrom) + 1} days). Refunds are paid {REFUND_WAIT_DAYS} days after move-out notice.
      </p>
    );

  if (r.status === "requested")
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <div className="grid gap-1.5">
            <Label htmlFor={`d-${r.id}`} className="text-xs">
              Deduction (optional)
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">â‚¦</span>
              <Input id={`d-${r.id}`} inputMode="numeric" className="pl-7" value={deduction ? deduction.toLocaleString("en-NG") : ""} onChange={(e) => setDeduct(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`dr-${r.id}`} className="text-xs">
              Reason (from check-out inspection)
            </Label>
            <Input id={`dr-${r.id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Broken wardrobe door" disabled={!deduction} />
          </div>
        </div>
        {deduction > r.amount && <p className="text-xs text-destructive">Deduction can&apos;t exceed the deposit.</p>}
        <Button
          variant="success"
          disabled={busy || deduction > r.amount || (deduction > 0 && !reason.trim())}
          onClick={async () => {
            setBusy(true);
            await sleep(600);
            const ok = approve(r.id, deduction ? { amount: deduction, reason: reason.trim() } : undefined);
            setBusy(false);
            if (ok) toast.success("Refund approved", { description: `${formatNaira(r.amount - deduction)} to ${r.bank.bankName}.` });
            else toast.error("This refund isn't eligible yet");
          }}
        >
          {busy ? <Loader2 className="animate-spin" /> : <CircleCheck />} Approve {formatNaira(r.amount - deduction)}
        </Button>
      </div>
    );

  if (r.status === "approved")
    return (
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await sleep(800);
          pay(r.id);
          setBusy(false);
          toast.success("Refund marked as paid Â· tenant notified");
        }}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Send />} Mark as paid
      </Button>
    );

  return (
    <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
      <CircleCheck className="size-4" /> Paid {formatDate(r.paidAt!)} Â· ref {r.payoutReference}
    </p>
  );
}

export default function AdminRefundsPage() {
  const refunds = useStore((s) => s.refunds);
  const properties = useStore((s) => s.properties);
  const users = useStore((s) => s.users);
  const [tab, setTab] = useState<CautionRefund["status"]>("requested");
  const byId = new Map(properties.map((p) => [p.id, p]));
  const usersById = new Map(users.map((u) => [u.id, u]));
  const list = refunds.filter((r) => r.status === tab).sort((a, b) => +new Date(a.eligibleFrom) - +new Date(b.eligibleFrom));
  const count = (st: CautionRefund["status"]) => refunds.filter((r) => r.status === st).length;
  const dueNow = refunds.filter((r) => r.status === "requested" && isRefundEligible(r.eligibleFrom)).length;

  return (
    <>
      <PageHeader title="Caution refunds" description={`Refund departing tenants' caution deposits ${REFUND_WAIT_DAYS} days after their move-out notice, less any inspection deductions.`} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Ready to approve" value={dueNow} icon={Banknote} tone="emerald" />
        <StatCard index={1} label="In 30-day wait" value={count("requested") - dueNow} icon={Hourglass} tone="amber" />
        <StatCard index={2} label="Approved, to pay" value={count("approved")} icon={Send} tone="blue" />
        <StatCard index={3} label="Paid" value={count("paid")} icon={CircleCheck} tone="slate" />
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-5">
        <TabsList>
          {(["requested", "approved", "paid"] as const).map((t) => (
            <TabsTrigger key={t} value={t}>
              {REFUND_STATUS[t].label.split(" Â·")[0]} <span className="text-[11px] text-muted-foreground">{count(t)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {list.length === 0 ? (
        <EmptyState icon={Banknote} title="No refunds here" description="Refund requests appear when departing tenants ask for their caution deposit back." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {list.map((r) => {
            const t = usersById.get(r.tenantId);
            const p = byId.get(r.propertyId);
            const eligible = isRefundEligible(r.eligibleFrom);
            return (
              <Card key={r.id} className="space-y-4 p-5">
                <div className="flex items-start gap-3">
                  <UserAvatar name={t?.name ?? "?"} hue={t?.avatarHue} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p?.title} Â· {p?.area}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold">{formatNaira(r.amount - (r.deduction?.amount ?? 0))}</p>
                    <Badge variant={REFUND_STATUS[r.status].variant}>{REFUND_STATUS[r.status].label}</Badge>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                  <div className="rounded-lg bg-muted/60 p-2.5">
                    <dt className="text-muted-foreground">Requested</dt>
                    <dd className="font-medium">{formatDate(r.requestedAt)}</dd>
                  </div>
                  <div className={`rounded-lg p-2.5 ${eligible ? "bg-success/10" : "bg-amber-500/10"}`}>
                    <dt className="flex items-center gap-1 text-muted-foreground">
                      <CalendarClock className="size-3" /> Payable from
                    </dt>
                    <dd className="font-medium">{formatDate(r.eligibleFrom)}</dd>
                  </div>
                  <div className="col-span-2 rounded-lg bg-muted/60 p-2.5 sm:col-span-1">
                    <dt className="flex items-center gap-1 text-muted-foreground">
                      <Landmark className="size-3" /> Pay to
                    </dt>
                    <dd className="truncate font-medium">
                      {r.bank.bankName} Â· {r.bank.accountNumber}
                    </dd>
                  </div>
                </dl>
                {r.deduction && (
                  <p className="text-xs text-muted-foreground">
                    Deposit {formatNaira(r.amount)} âˆ’ {formatNaira(r.deduction.amount)} ({r.deduction.reason})
                  </p>
                )}
                <RefundActions r={r} />
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}


