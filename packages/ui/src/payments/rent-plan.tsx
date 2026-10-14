"use client";

import { ZoneLink as Link } from "../zone-link";
import { useState } from "react";
import { AlertTriangle, ArrowRight, CalendarRange, CircleCheck, DoorOpen, Hourglass, Landmark, Loader2, PiggyBank, Send, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Lease, RentContribution, RentPlan } from "renton-shared/types";
import type { BadgeProps } from "../ui/badge";
import { useStore } from "renton-core/store";
import { currentRentPlan, MIN_INSTALLMENT, rentPlanProgress, type RentPlanProgress } from "renton-core/tenancy-rules";
import { BankDetails, ReceiptPicker } from "./payment-parts";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { cn, formatDate, formatNaira, sleep } from "renton-core/utils";

export const CONTRIBUTION_STATUS: Record<RentContribution["status"], { label: string; variant: NonNullable<BadgeProps["variant"]> }> = {
  submitted: { label: "Verifying", variant: "info" },
  verified: { label: "Confirmed", variant: "success" },
  rejected: { label: "Not verified", variant: "destructive" },
};

export const SCHEDULE_LABEL: Record<RentPlan["schedule"], string> = { monthly: "Monthly", flexible: "Any amount" };

/** Saved (verified) + pending (awaiting verification) stacked against the rent target. */
export function RentPlanBar({ progress, className }: { progress: RentPlanProgress; className?: string }) {
  const pendingPct = progress.target ? Math.min(100 - progress.pct, (progress.pending / progress.target) * 100) : 0;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.target}
        aria-valuenow={progress.saved}
        aria-label={`${formatNaira(progress.saved)} of ${formatNaira(progress.target)} paid`}
      >
        <span className="h-full bg-success transition-all duration-700" style={{ width: `${progress.pct}%` }} />
        <span className="h-full bg-primary/40 transition-all duration-700" style={{ width: `${pendingPct}%` }} />
      </div>
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-success" /> Paid {formatNaira(progress.saved)}
        </span>
        {progress.pending > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary/40" /> Verifying {formatNaira(progress.pending)}
          </span>
        )}
        <span className="font-medium text-foreground">{Math.floor(progress.pct)}%</span>
      </div>
    </div>
  );
}

function StartPlan({ lease }: { lease: Lease }) {
  const start = useStore((s) => s.startRentPlan);
  const [schedule, setSchedule] = useState<RentPlan["schedule"]>("monthly");
  const options: { value: RentPlan["schedule"]; title: string; body: string; icon: typeof CalendarRange }[] = [
    { value: "monthly", title: "Monthly", body: "We work out a monthly amount so the rent is ready on time.", icon: CalendarRange },
    { value: "flexible", title: "Any amount, any time", body: "Pay whatever you have, whenever you have it.", icon: Sparkles },
  ];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pay your next rent in installments instead of all at once. Every payment goes into renton&apos;s account, and once the full rent is paid, renton pays your landlord.
      </p>
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="How do you want to pay?">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={schedule === o.value}
            onClick={() => setSchedule(o.value)}
            className={cn("flex gap-3 rounded-xl border p-4 text-left transition-all", schedule === o.value ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "hover:border-primary/40")}
          >
            <o.icon className={cn("mt-0.5 size-5 shrink-0", schedule === o.value ? "text-primary" : "text-muted-foreground")} />
            <span>
              <span className="block text-sm font-semibold">{o.title}</span>
              <span className="block text-xs text-muted-foreground">{o.body}</span>
            </span>
          </button>
        ))}
      </div>
      <Button
        className="w-full sm:w-auto"
        onClick={() => {
          if (start(lease.id, schedule)) toast.success("Installment plan started", { description: "Make your first payment whenever you're ready." });
          else toast.error("Couldn't start an installment plan for this lease");
        }}
      >
        <PiggyBank /> Start paying in installments
      </Button>
    </div>
  );
}

function ContributionForm({ plan, progress }: { plan: RentPlan; progress: RentPlanProgress }) {
  const submit = useStore((s) => s.submitRentContribution);
  const suggestion = plan.schedule === "monthly" ? Math.min(progress.monthly, progress.maxNext) : 0;
  const [file, setFile] = useState<{ name: string; kind: "image" | "pdf"; url: string } | null>(null);
  const [amount, setAmount] = useState(suggestion ? String(suggestion) : "");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [bank, setBank] = useState("");
  const [busy, setBusy] = useState(false);
  const paid = Number(amount.replace(/\D/g, "") || 0);
  const min = Math.min(MIN_INSTALLMENT, progress.maxNext);
  const tooMuch = paid > progress.maxNext;
  const tooLittle = paid > 0 && paid < min;
  const chips = [...new Set([suggestion, Math.round(progress.maxNext / 2 / 1000) * 1000, progress.maxNext])].filter((n) => n >= min && n <= progress.maxNext);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!paid) return toast.error("Enter how much you paid");
        if (tooMuch || tooLittle) return;
        if (!file) return toast.error("Upload your transfer receipt first");
        if (!bank.trim()) return toast.error("Enter the bank you paid from");
        setBusy(true);
        await sleep(800);
        const res = submit(plan.id, { ...file, amountPaid: paid, paidOn: new Date(paidOn).toISOString(), payerBank: bank.trim() });
        setBusy(false);
        if (!res.ok) return toast.error(res.reason);
        toast.success("Installment submitted", { description: "We'll confirm it within one business day." });
        setFile(null);
        setAmount("");
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={`rp-amt-${plan.id}`}>How much did you send?</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">â‚¦</span>
          <Input
            id={`rp-amt-${plan.id}`}
            inputMode="numeric"
            className="pl-7"
            value={paid ? paid.toLocaleString("en-NG") : ""}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={tooMuch || tooLittle}
            placeholder="Any amount"
          />
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setAmount(String(n))}
                className={cn("rounded-full border px-2.5 py-1 text-xs", paid === n ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40")}
              >
                {n === progress.maxNext ? `Pay off ${formatNaira(n)}` : n === suggestion ? `Monthly ${formatNaira(n)}` : formatNaira(n)}
              </button>
            ))}
          </div>
        )}
        {tooMuch && <p className="text-xs text-destructive">You only have {formatNaira(progress.maxNext)} left to pay.</p>}
        {tooLittle && <p className="text-xs text-destructive">The minimum installment is {formatNaira(min)}.</p>}
      </div>
      <ReceiptPicker value={file} onChange={setFile} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`rp-date-${plan.id}`}>Date paid</Label>
          <Input id={`rp-date-${plan.id}`} type="date" value={paidOn} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setPaidOn(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`rp-bank-${plan.id}`}>Paid from (bank)</Label>
          <Input id={`rp-bank-${plan.id}`} value={bank} onChange={(e) => setBank(e.target.value)} placeholder="e.g. GTBank" />
        </div>
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={busy || tooMuch || tooLittle}>
        {busy ? <Loader2 className="animate-spin" /> : <Send />} Submit installment
      </Button>
    </form>
  );
}

function History({ plan }: { plan: RentPlan }) {
  if (plan.contributions.length === 0) return <p className="text-sm text-muted-foreground">No payments yet.</p>;
  return (
    <ul className="divide-y rounded-xl border">
      {[...plan.contributions].reverse().map((c) => (
        <li key={c.id} className="flex items-start justify-between gap-3 p-3">
          <div className="min-w-0">
            <p className="font-semibold tabular-nums">{formatNaira(c.amount)}</p>
            <p className="text-xs text-muted-foreground">
              Paid {formatDate(c.receipt.paidOn)} Â· {c.receipt.payerBank}
              {c.receiptNumber && ` Â· ${c.receiptNumber}`}
            </p>
            {c.status === "rejected" && c.rejectionReason && <p className="mt-1 text-xs text-destructive">{c.rejectionReason}</p>}
          </div>
          <Badge variant={CONTRIBUTION_STATUS[c.status].variant}>{CONTRIBUTION_STATUS[c.status].label}</Badge>
        </li>
      ))}
    </ul>
  );
}

/** Tenant view: start a plan, pay installments to renton, and track progress to the landlord payout. */
export function RentPlanPanel({ lease }: { lease: Lease }) {
  const plans = useStore((s) => s.rentPlans);
  const setSchedule = useStore((s) => s.setRentPlanSchedule);
  const plan = currentRentPlan(plans, lease);
  const movingOut = lease.intent?.decision === "move_out";

  if (!plan) {
    if (movingOut)
      return (
        <p className="flex items-start gap-2 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
          <DoorOpen className="mt-0.5 size-4 shrink-0" /> You&apos;ve given notice to move out, so there&apos;s no next rent to pay.
        </p>
      );
    return <StartPlan lease={lease} />;
  }

  const progress = rentPlanProgress(plan, lease);
  const paidOut = plan.status === "paid_out";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Rent for the term starting {formatDate(plan.dueDate)}</p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {formatNaira(progress.saved)} <span className="text-base font-medium text-muted-foreground">of {formatNaira(progress.target)}</span>
          </p>
        </div>
        {!paidOut && !progress.funded && (
          <div className="flex rounded-lg border p-0.5 text-xs" role="radiogroup" aria-label="Payment schedule">
            {(["monthly", "flexible"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={plan.schedule === v}
                onClick={() => setSchedule(plan.id, v)}
                className={cn("rounded-md px-2.5 py-1 font-medium transition-colors", plan.schedule === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {SCHEDULE_LABEL[v]}
              </button>
            ))}
          </div>
        )}
      </div>

      <RentPlanBar progress={progress} />

      {paidOut ? (
        <div className="flex gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
          <CircleCheck className="size-5 shrink-0 text-success" />
          <div>
            <p className="text-sm font-semibold">Your landlord has been paid</p>
            <p className="text-sm text-muted-foreground">
              renton paid {formatNaira(plan.payout!.amount)} to your landlord on {formatDate(plan.payout!.at)} (ref {plan.payout!.reference}). Your rent for the next term is settled.
            </p>
          </div>
        </div>
      ) : progress.funded ? (
        <div className="flex gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
          <Landmark className="size-5 shrink-0 text-success" />
          <div>
            <p className="text-sm font-semibold">Rent fully paid ðŸŽ‰</p>
            <p className="text-sm text-muted-foreground">renton is now paying {formatNaira(progress.target)} to your landlord. We&apos;ll let you know when it&apos;s done.</p>
          </div>
        </div>
      ) : movingOut ? (
        <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> You&apos;ve given notice to move out, so new installments are paused. Contact renton support about the{" "}
          {formatNaira(progress.saved)} you&apos;ve already paid.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-muted/60 p-3">
              <dt className="text-xs text-muted-foreground">Left to pay</dt>
              <dd className="font-semibold tabular-nums">{formatNaira(progress.remaining)}</dd>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <dt className="text-xs text-muted-foreground">Due</dt>
              <dd className="font-semibold">{formatDate(plan.dueDate)}</dd>
            </div>
            <div className="col-span-2 rounded-xl bg-primary/5 p-3 sm:col-span-1">
              <dt className="text-xs text-muted-foreground">{plan.schedule === "monthly" ? "Your monthly amount" : "To finish on time"}</dt>
              <dd className="font-semibold tabular-nums">
                {formatNaira(progress.monthly)}
                <span className="text-xs font-normal text-muted-foreground">/mo Ã— {progress.monthsLeft}</span>
              </dd>
            </div>
          </dl>

          {progress.maxNext > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold">1. Transfer to renton</p>
                <BankDetails reference={plan.reference} />
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5 shrink-0 text-success" /> Use the same reference every time. Never pay your landlord directly.
                </p>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">2. Tell us what you paid</p>
                <ContributionForm key={progress.maxNext} plan={plan} progress={progress} />
              </div>
            </div>
          ) : (
            <p className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
              <Hourglass className="mt-0.5 size-4 shrink-0 text-primary" /> Your payments cover the full rent. We&apos;re verifying the last {formatNaira(progress.pending)}.
            </p>
          )}
        </>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold">Payment history</p>
        <History plan={plan} />
      </div>
    </div>
  );
}

/** Compact progress for My Home and the tenant dashboard. */
export function RentPlanSummary({ lease, className }: { lease: Lease; className?: string }) {
  const plans = useStore((s) => s.rentPlans);
  const plan = currentRentPlan(plans, lease);
  if (!plan) {
    if (lease.intent?.decision === "move_out") return null;
    return (
      <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4", className)}>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <PiggyBank className="size-4 shrink-0 text-primary" /> Pay your next rent in installments: monthly or any amount.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href="/tenant/payments#rent">
            Get started <ArrowRight />
          </Link>
        </Button>
      </div>
    );
  }
  const progress = rentPlanProgress(plan, lease);
  return (
    <Link href="/tenant/payments#rent" className={cn("block space-y-2 rounded-xl border p-4 transition-colors hover:border-primary/40", className)}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <PiggyBank className="size-4 text-primary" /> Rent installments
        </span>
        <span className="text-xs text-muted-foreground">
          {plan.status === "paid_out" ? "Landlord paid âœ”" : progress.funded ? "Fully paid" : `${formatNaira(progress.remaining)} to go`}
        </span>
      </div>
      <RentPlanBar progress={progress} />
    </Link>
  );
}

/** Landlord view: how much of the next rent the tenant has paid to renton, and the payout once it's complete. */
export function LandlordRentPlanStatus({ lease, plans }: { lease: Lease; plans: RentPlan[] }) {
  const plan = currentRentPlan(plans, lease);
  if (!plan) return null;
  const progress = rentPlanProgress(plan, lease);
  return (
    <div className="mt-4 space-y-3 rounded-xl border p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <PiggyBank className="size-4 text-primary" /> Paying in installments via renton
      </p>
      <RentPlanBar progress={progress} />
      <p className="text-xs text-muted-foreground">
        {plan.status === "paid_out"
          ? `renton paid you ${formatNaira(plan.payout!.amount)} on ${formatDate(plan.payout!.at)} Â· ref ${plan.payout!.reference}.`
          : progress.funded
            ? `Rent for the term from ${formatDate(plan.dueDate)} is fully paid. renton is sending you ${formatNaira(progress.target)}.`
            : `${formatNaira(progress.saved)} of ${formatNaira(progress.target)} paid for the term from ${formatDate(plan.dueDate)}. renton holds it and pays you the full amount once it's complete.`}
      </p>
    </div>
  );
}


