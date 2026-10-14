"use client";

import { useState } from "react";
import { ArrowRight, Check, Handshake, Loader2, Lock, MessageSquareQuote, TrendingUp, Undo2 } from "lucide-react";
import { toast } from "sonner";
import type { Lease, RentReview } from "@/types";
import { useStore } from "renton-core/store";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Input } from "renton-ui/ui/input";
import { Textarea } from "renton-ui/ui/textarea";
import { cn, formatDate, formatNaira, sleep, timeAgo } from "renton-core/utils";

export const REVIEW_STATUS: Record<RentReview["status"], { tenant: string; landlord: string; variant: "warning" | "info" | "success" | "neutral" }> = {
  proposed: { tenant: "Your response needed", landlord: "Waiting for tenant", variant: "warning" },
  countered: { tenant: "Waiting for landlord", landlord: "Counter-offer received", variant: "info" },
  agreed: { tenant: "Agreed", landlord: "Agreed", variant: "success" },
  withdrawn: { tenant: "Withdrawn", landlord: "Withdrawn", variant: "neutral" },
};

const pct = (from: number, to: number) => `${to >= from ? "+" : ""}${(((to - from) / from) * 100).toFixed(1)}%`;

export function OfferThread({ review, viewer }: { review: RentReview; viewer: "tenant" | "landlord" }) {
  return (
    <ol className="space-y-2">
      {review.offers.map((o) => {
        const mine = o.by === viewer;
        return (
          <li key={o.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm", mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-card")}>
              <p className="font-semibold">
                {formatNaira(o.amount)}/yr <span className={cn("text-xs font-normal", mine ? "text-white/75" : "text-muted-foreground")}>{pct(review.currentRent, o.amount)}</span>
              </p>
              {o.note && <p className={cn("mt-0.5 text-xs", mine ? "text-white/85" : "text-muted-foreground")}>{o.note}</p>}
              <p className={cn("mt-1 text-[10px]", mine ? "text-white/60" : "text-muted-foreground")}>
                {o.by === "landlord" ? "Landlord" : "Tenant"} Â· {timeAgo(o.at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Tenant view: see the proposed new rent, accept it or make a counter-offer. */
export function TenantRentReview({ lease }: { lease: Lease }) {
  const respond = useStore((s) => s.tenantRespondRent);
  const [countering, setCountering] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const rr = lease.rentReview;
  if (!rr) return null;

  const latest = rr.offers[rr.offers.length - 1].amount;
  const counter = Number(amount.replace(/\D/g, "") || 0);
  const counterError = counter && (counter < rr.currentRent ? "Can't be below your current rent" : counter >= latest ? "Should be lower than the landlord's offer" : null);

  const act = async (fn: () => void, msg: string) => {
    setBusy(true);
    await sleep(600);
    fn();
    setBusy(false);
    setCountering(false);
    toast.success(msg);
  };

  if (rr.status === "agreed") {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success text-white">
            {rr.negotiable ? <Handshake className="size-5" /> : <Lock className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{rr.negotiable ? "New rent agreed" : "New rent for your next term"}</p>
            <p className="font-display text-2xl font-bold">{formatNaira(rr.agreedRent!)} / year</p>
            <p className="text-sm text-muted-foreground">
              Payable from {formatDate(rr.effectiveFrom)} Â· was {formatNaira(rr.currentRent)} ({pct(rr.currentRent, rr.agreedRent!)})
            </p>
            {!rr.negotiable && <p className="mt-2 text-xs text-muted-foreground">You hadn&apos;t moved in when this was set, so it isn&apos;t open to negotiation.</p>}
          </div>
        </div>
      </div>
    );
  }

  if (rr.status === "withdrawn") {
    return (
      <p className="rounded-2xl border bg-subtle p-4 text-sm text-muted-foreground">
        Your landlord withdrew the proposed increase. Your rent stays at <span className="font-semibold text-foreground">{formatNaira(rr.currentRent)}/yr</span>.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="font-semibold">{formatNaira(rr.currentRent)}</p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Latest offer</p>
            <p className="font-display text-xl font-bold">{formatNaira(latest)}</p>
          </div>
          <Badge variant="warning" className="ml-1">
            <TrendingUp /> {pct(rr.currentRent, latest)}
          </Badge>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Notice served {formatDate(rr.noticeServedAt)} Â· applies from {formatDate(rr.effectiveFrom)}
      </p>
      <OfferThread review={rr} viewer="tenant" />

      {rr.status === "proposed" &&
        (countering ? (
          <div className="space-y-3 rounded-2xl border bg-subtle p-4">
            <p className="text-sm font-semibold">Your counter-offer</p>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">â‚¦</span>
              <Input
                inputMode="numeric"
                className="pl-7"
                value={counter ? counter.toLocaleString("en-NG") : ""}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={rr.currentRent.toLocaleString("en-NG")}
                aria-label="Counter-offer amount per year"
                aria-invalid={!!counterError}
              />
            </div>
            {counterError && <p className="text-xs text-destructive">{counterError}</p>}
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain your offer (optional)" aria-label="Note to landlord" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setCountering(false)}>
                Cancel
              </Button>
              <Button disabled={!counter || !!counterError || busy} onClick={() => act(() => respond(lease.id, { counter, note: note.trim() || undefined }), "Counter-offer sent")}>
                {busy ? <Loader2 className="animate-spin" /> : <MessageSquareQuote />} Send offer
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={() => setCountering(true)}>
              <Undo2 /> Make a counter-offer
            </Button>
            <Button variant="success" disabled={busy} onClick={() => act(() => respond(lease.id, { accept: true }), `New rent of ${formatNaira(latest)} agreed`)}>
              {busy ? <Loader2 className="animate-spin" /> : <Check />} Accept {formatNaira(latest)}
            </Button>
          </div>
        ))}
      {rr.status === "countered" && <p className="text-sm text-muted-foreground">Your offer has been sent. We&apos;ll notify you when your landlord responds.</p>}
    </div>
  );
}


