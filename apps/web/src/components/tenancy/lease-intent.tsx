"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Check, DoorOpen, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Lease } from "@/types";
import { useStore } from "renton-core/store";
import { Button } from "renton-ui/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "renton-ui/ui/dialog";
import { Input } from "renton-ui/ui/input";
import { Label } from "renton-ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "renton-ui/ui/select";
import { Textarea } from "renton-ui/ui/textarea";
import { cn, formatDate, formatNaira, sleep } from "renton-core/utils";

const MOVE_OUT_REASONS = ["Relocating to another city", "Buying my own home", "Need a bigger space", "Need a smaller / cheaper space", "Closer to work or school", "Other"];

function IntentDialog({ lease, mode, onClose }: { lease: Lease; mode: "renew" | "move_out" | null; onClose: () => void }) {
  const setIntent = useStore((s) => s.setLeaseIntent);
  const [years, setYears] = useState("1");
  const [date, setDate] = useState(lease.leaseEnd.slice(0, 10));
  const [reason, setReason] = useState(MOVE_OUT_REASONS[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await sleep(700);
    setIntent(
      lease.id,
      mode === "renew"
        ? { decision: "renew", renewYears: Number(years), note: note.trim() || undefined }
        : { decision: "move_out", moveOutDate: new Date(date).toISOString(), reason, note: note.trim() || undefined }
    );
    setSaving(false);
    onClose();
    toast.success(mode === "renew" ? "Renewal request sent" : "Move-out notice sent", { description: "Your landlord has been notified." });
  };

  return (
    <Dialog open={!!mode} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{mode === "renew" ? "Renew your lease" : "Give move-out notice"}</DialogTitle>
            <DialogDescription>
              {mode === "renew"
                ? `Your current term ends ${formatDate(lease.leaseEnd)}. Your landlord will confirm the renewal.`
                : "Let your landlord know when you plan to leave so they can prepare a check-out inspection."}
            </DialogDescription>
          </DialogHeader>
          {mode === "renew" ? (
            <div className="grid gap-2">
              <Label>Renew for</Label>
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3"].map((y) => (
                  <button
                    key={y}
                    type="button"
                    aria-pressed={years === y}
                    onClick={() => setYears(y)}
                    className={cn("rounded-xl border py-3 text-center transition-all", years === y ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/40")}
                  >
                    <p className="font-display text-lg font-bold">{y}</p>
                    <p className="text-xs text-muted-foreground">year{y !== "1" && "s"}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatNaira(lease.annualRent * Number(years))} at today&apos;s rent. Your landlord may propose a review.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="moveout">Move-out date</Label>
                <Input id="moveout" type="date" value={date} max={lease.leaseEnd.slice(0, 10)} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger aria-label="Reason for moving out">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVE_OUT_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="intent-note">Note to landlord (optional)</Label>
            <Textarea id="intent-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === "renew" ? "Anything you'd like to discuss before renewing?" : "E.g. available times for viewings by new tenants"} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant={mode === "renew" ? "success" : "default"} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} {mode === "renew" ? "Request renewal" : "Send notice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Tenant-facing panel: choose renew / move out, or see the decision and landlord's response. */
export function LeaseIntentPanel({ lease }: { lease: Lease }) {
  const clear = useStore((s) => s.clearLeaseIntent);
  const [mode, setMode] = useState<"renew" | "move_out" | null>(null);
  const intent = lease.intent;

  if (intent) {
    const renew = intent.decision === "renew";
    const responded = !!intent.landlordResponse;
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-2xl border p-5", renew ? "border-success/30 bg-success/5" : "border-amber-500/30 bg-amber-500/5")}>
        <div className="flex items-start gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", renew ? "bg-success text-white" : "bg-amber-500 text-white")}>
            {renew ? <RefreshCw className="size-5" /> : <DoorOpen className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{renew ? `You're renewing for ${intent.renewYears} year${intent.renewYears === 1 ? "" : "s"}` : `You're moving out on ${formatDate(intent.moveOutDate!)}`}</p>
            <p className="text-sm text-muted-foreground">
              Sent {formatDate(intent.submittedAt)}
              {intent.reason && ` Â· ${intent.reason}`}
            </p>
            <p className={cn("mt-2 inline-flex items-center gap-1.5 text-sm font-medium", responded ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
              {responded ? <Check className="size-4" /> : <Loader2 className="size-4 animate-spin" />}
              {responded ? (renew ? "Landlord accepted your renewal" : "Landlord acknowledged your notice") : "Waiting for your landlord to respond"}
            </p>
          </div>
        </div>
        {!responded && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => {
              clear(lease.id);
              toast("Decision withdrawn");
            }}
          >
            <RotateCcw /> Change my decision
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("renew")}
          className="group flex items-start gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-success/50 hover:shadow-[var(--shadow-lift)]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-emerald-600 transition-colors group-hover:bg-success group-hover:text-white">
            <CalendarCheck className="size-5" />
          </span>
          <span>
            <span className="block font-semibold">I&apos;ll renew</span>
            <span className="block text-sm text-muted-foreground">Stay for another 1â€“3 years</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode("move_out")}
          className="group flex items-start gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-amber-500/50 hover:shadow-[var(--shadow-lift)]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition-colors group-hover:bg-amber-500 group-hover:text-white">
            <DoorOpen className="size-5" />
          </span>
          <span>
            <span className="block font-semibold">I&apos;ll move out</span>
            <span className="block text-sm text-muted-foreground">Give notice before your term ends</span>
          </span>
        </button>
      </div>
      <IntentDialog key={mode ?? "closed"} lease={lease} mode={mode} onClose={() => setMode(null)} />
    </>
  );
}


