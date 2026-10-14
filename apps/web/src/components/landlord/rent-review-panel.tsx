"use client";

import { useState } from "react";
import { Check, Loader2, Send, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import type { Lease } from "@/types";
import { useStore } from "renton-core/store";
import { OfferThread, REVIEW_STATUS } from "@/components/tenancy/rent-review";
import { RentIncreaseDialog } from "./rent-increase-dialog";
import { canServeRentNotice } from "renton-core/tenancy-rules";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Input } from "renton-ui/ui/input";
import { Textarea } from "renton-ui/ui/textarea";
import { formatDate, formatNaira, sleep } from "renton-core/utils";

/** Landlord view of a lease's rent review inside the tenant drawer. */
export function LandlordRentReviewPanel({ lease }: { lease: Lease }) {
  const respond = useStore((s) => s.landlordRespondRent);
  const [revising, setRevising] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const rr = lease.rentReview;
  const notice = canServeRentNotice(lease);

  const act = async (fn: () => void, msg: string) => {
    setBusy(true);
    await sleep(500);
    fn();
    setBusy(false);
    setRevising(false);
    toast.success(msg);
  };

  if (!rr || rr.status === "withdrawn") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Current rent {formatNaira(lease.annualRent)}/yr.{" "}
          {notice.ok ? `You can serve a rent increase until ${formatDate(new Date(new Date(lease.leaseEnd).getTime() - 90 * 86400000).toISOString())}.` : `${notice.reason}.`}
        </p>
        <RentIncreaseDialog presetLeaseId={`lease:${lease.id}`}>
          <Button variant="outline" size="sm" disabled={!notice.ok && new Date(lease.leaseStart) <= new Date()}>
            <TrendingUp /> Increase rent
          </Button>
        </RentIncreaseDialog>
      </div>
    );
  }

  const latest = rr.offers[rr.offers.length - 1].amount;
  const revised = Number(amount.replace(/\D/g, "") || 0);
  const tenantOffer = rr.status === "countered" ? latest : 0;
  const revisedError = revised && (revised <= tenantOffer ? "Must be above the tenant's offer (or accept it)" : revised < rr.currentRent ? "Below current rent" : null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          {formatNaira(rr.currentRent)} â†’ <span className="font-semibold">{formatNaira(rr.status === "agreed" ? rr.agreedRent! : latest)}</span>
          <span className="text-muted-foreground"> from {formatDate(rr.effectiveFrom)}</span>
        </p>
        <Badge variant={REVIEW_STATUS[rr.status].variant}>{REVIEW_STATUS[rr.status].landlord}</Badge>
      </div>
      {!rr.negotiable && <p className="text-xs text-muted-foreground">Tenant hadn&apos;t moved in, so this rent applies without negotiation.</p>}
      <OfferThread review={rr} viewer="landlord" />

      {rr.status === "countered" &&
        (revising ? (
          <div className="space-y-2 rounded-xl border bg-subtle p-3">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">â‚¦</span>
              <Input inputMode="numeric" className="pl-7" value={revised ? revised.toLocaleString("en-NG") : ""} onChange={(e) => setAmount(e.target.value)} placeholder="Revised rent per year" aria-label="Revised rent" />
            </div>
            {revisedError && <p className="text-xs text-destructive">{revisedError}</p>}
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to tenant (optional)" aria-label="Note" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => setRevising(false)}>
                Cancel
              </Button>
              <Button size="sm" disabled={!revised || !!revisedError || busy} onClick={() => act(() => respond(lease.id, { counter: revised, note: note.trim() || undefined }), "Revised offer sent")}>
                <Send /> Send
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button size="sm" variant="success" disabled={busy} onClick={() => act(() => respond(lease.id, { acceptCounter: true }), `Agreed at ${formatNaira(latest)}`)}>
              {busy ? <Loader2 className="animate-spin" /> : <Check />} Accept {formatNaira(latest)}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRevising(true)}>
              Counter
            </Button>
          </div>
        ))}
      {(rr.status === "proposed" || rr.status === "countered") && (
        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => act(() => respond(lease.id, { withdraw: true }), "Rent increase withdrawn")}>
          <X /> Withdraw increase
        </Button>
      )}
    </div>
  );
}


