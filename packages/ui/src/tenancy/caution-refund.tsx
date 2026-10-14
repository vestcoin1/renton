"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Banknote, CalendarClock, CircleCheck, Clock, Landmark, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import type { CautionRefund, Lease } from "renton-shared/types";
import { useStore } from "renton-core/store";
import { REFUND_WAIT_DAYS, daysUntil, isRefundEligible, refundEligibleFrom } from "renton-core/tenancy-rules";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { cn, formatDate, formatNaira, sleep } from "renton-core/utils";

export const REFUND_STATUS: Record<CautionRefund["status"], { label: string; variant: "warning" | "info" | "success" }> = {
  requested: { label: "Requested", variant: "warning" },
  approved: { label: "Approved Â· paying out", variant: "info" },
  paid: { label: "Paid", variant: "success" },
};

function useCautionAmount(lease: Lease) {
  return useStore((s) => s.invoices.find((i) => i.leaseId === lease.id)?.items.find((i) => i.key === "caution")?.amount ?? s.properties.find((p) => p.id === lease.propertyId)?.cautionDeposit ?? 0);
}

function Tracker({ refund }: { refund: CautionRefund }) {
  const eligible = isRefundEligible(refund.eligibleFrom);
  const steps = [
    { label: "Requested", done: true, at: refund.requestedAt },
    { label: eligible ? "30-day wait complete" : `Payable from ${formatDate(refund.eligibleFrom)}`, done: eligible, at: refund.eligibleFrom },
    { label: "Approved", done: refund.status !== "requested", at: refund.approvedAt },
    { label: "Paid to your bank", done: refund.status === "paid", at: refund.paidAt },
  ];
  return (
    <ol className="space-y-3">
      {steps.map((s) => (
        <li key={s.label} className="flex items-center gap-3 text-sm">
          {s.done ? <CircleCheck className="size-5 shrink-0 text-success" /> : <Clock className="size-5 shrink-0 text-muted-foreground/50" />}
          <span className={cn("flex-1", !s.done && "text-muted-foreground")}>{s.label}</span>
          {s.done && s.at && <span className="text-xs text-muted-foreground">{formatDate(s.at)}</span>}
        </li>
      ))}
    </ol>
  );
}

/** Lets a departing tenant request their caution deposit back (payable 30 days after notice). */
export function CautionRefundPanel({ lease, refund }: { lease: Lease; refund?: CautionRefund }) {
  const request = useStore((s) => s.requestCautionRefund);
  const amount = useCautionAmount(lease);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  if (lease.intent?.decision !== "move_out") {
    return (
      <p className="flex items-start gap-2 rounded-xl border bg-subtle p-4 text-sm text-muted-foreground">
        <Lock className="mt-0.5 size-4 shrink-0" /> Your {formatNaira(amount)} caution deposit can be refunded once you give move-out notice. It&apos;s paid {REFUND_WAIT_DAYS} days after your notice.
      </p>
    );
  }

  const eligibleFrom = refund?.eligibleFrom ?? refundEligibleFrom(lease.intent);
  const days = daysUntil(eligibleFrom);
  const eligible = isRefundEligible(eligibleFrom);

  if (refund) {
    const payout = refund.amount - (refund.deduction?.amount ?? 0);
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={REFUND_STATUS[refund.status].variant}>{REFUND_STATUS[refund.status].label}</Badge>
            {!eligible && <Badge variant="neutral">{days + 1} days to go</Badge>}
          </div>
          <p className="font-display text-2xl font-bold">{formatNaira(payout)}</p>
          {refund.deduction && (
            <p className="text-xs text-muted-foreground">
              {formatNaira(refund.amount)} deposit âˆ’ {formatNaira(refund.deduction.amount)} ({refund.deduction.reason})
            </p>
          )}
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Landmark className="size-4" /> {refund.bank.bankName} Â· {refund.bank.accountNumber}
          </p>
          {refund.payoutReference && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
              <BadgeCheck className="size-3.5" /> Payout ref {refund.payoutReference}
            </p>
          )}
        </div>
        <Tracker refund={refund} />
      </div>
    );
  }

  const validAccount = /^\d{10}$/.test(accountNumber);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!bankName.trim() || !validAccount || !accountName.trim()) return toast.error("Enter your bank name, 10-digit account number and account name");
        setBusy(true);
        await sleep(700);
        request(lease.id, { bankName: bankName.trim(), accountNumber, accountName: accountName.trim() });
        setBusy(false);
        toast.success("Refund requested", { description: `We'll pay it out from ${formatDate(eligibleFrom)} after a check-out inspection.` });
      }}
    >
      <div className="flex flex-col gap-3 rounded-xl border bg-subtle p-4 sm:flex-row sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-emerald-600">
          <Banknote className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Refundable caution deposit</p>
          <p className="font-display text-xl font-bold">{formatNaira(amount)}</p>
        </div>
        <p className={cn("flex items-center gap-1.5 text-sm font-medium", eligible ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")}>
          <CalendarClock className="size-4" />
          {eligible ? "Payable now" : `Payable from ${formatDate(eligibleFrom)} (${days + 1} days)`}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="rf-bank">Bank</Label>
          <Input id="rf-bank" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Access Bank" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rf-acct">Account number</Label>
          <Input
            id="rf-acct"
            inputMode="numeric"
            maxLength={10}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
            placeholder="10 digits"
            aria-invalid={accountNumber.length > 0 && !validAccount}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rf-name">Account name</Label>
          <Input id="rf-name" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="As shown on your account" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Refunds are paid {REFUND_WAIT_DAYS} days after your move-out notice ({formatDate(lease.intent.submittedAt)}), less the cost of any damage found at the check-out inspection.
      </p>
      <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Banknote />} Request caution refund
      </Button>
    </form>
  );
}


