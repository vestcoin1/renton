"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { CircleCheck, FileText, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import type { Property } from "@/types";
import { useStore } from "renton-core/store";
import { GatePrompt, useIdentityGate } from "@/components/identity/identity-gate";
import { Button } from "renton-ui/ui/button";
import { Checkbox } from "renton-ui/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "renton-ui/ui/dialog";
import { Input } from "renton-ui/ui/input";
import { Label } from "renton-ui/ui/label";
import { Textarea } from "renton-ui/ui/textarea";
import { RadioGroup, RadioGroupItem } from "renton-ui/ui/radio-group";
import { formatNaira, sleep } from "renton-core/utils";

const DOCS = ["Employment letter", "Last 3 months bank statement", "NIN slip", "Guarantor form"];

export function ApplyDialog({ property, children }: { property: Property; children: React.ReactNode }) {
  const apply = useStore((s) => s.applyToProperty);
  const block = useIdentityGate("tenant");
  const already = useStore((s) => s.applications.some((a) => a.propertyId === property.id && a.tenantId === s.userId));
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [moveIn, setMoveIn] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [years, setYears] = useState("1");
  const [message, setMessage] = useState("");
  const [docs, setDocs] = useState<string[]>(DOCS.slice(0, 3));
  const [error, setError] = useState<string>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 20) {
      setError("Tell the landlord a little about yourself (at least 20 characters).");
      return;
    }
    setError(undefined);
    setSubmitting(true);
    await sleep(900);
    apply({
      propertyId: property.id,
      moveInDate: new Date(moveIn).toISOString(),
      leaseYears: Number(years),
      message: message.trim(),
      documents: docs.map((d) => `${d}.pdf`),
    });
    setSubmitting(false);
    setDone(true);
    toast.success("Application sent", { description: `The landlord typically responds within a few hours.` });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTimeout(() => setDone(false), 200);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {done ? (
          <div className="flex flex-col items-center py-6 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="flex size-16 items-center justify-center rounded-full bg-success/15">
              <CircleCheck className="size-9 text-success" />
            </motion.div>
            <DialogTitle className="mt-5 text-xl">Application submitted!</DialogTitle>
            <DialogDescription className="mt-2 max-w-sm">
              Your rental profile has been shared with the landlord of <span className="font-medium text-foreground">{property.title}</span>. We&apos;ll notify you as soon as they respond.
            </DialogDescription>
            <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href="/tenant/applications">Track application</Link>
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Keep browsing
              </Button>
            </div>
          </div>
        ) : block ? (
          <>
            <DialogTitle className="sr-only">Apply for this home</DialogTitle>
            <GatePrompt block={block} role="tenant" action="apply for this home" />
          </>
        ) : (
          <form onSubmit={submit} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Apply for this home</DialogTitle>
              <DialogDescription>
                {property.title} Â· {formatNaira(property.rent)}/year
              </DialogDescription>
            </DialogHeader>
            {already && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                You&apos;ve already applied for this property. Submitting again will create a new application.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="move-in">Preferred move-in date</Label>
                <Input id="move-in" type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>Lease length</Label>
                <RadioGroup value={years} onValueChange={setYears} className="flex h-10 items-center gap-4">
                  {["1", "2", "3"].map((y) => (
                    <Label key={y} className="flex cursor-pointer items-center gap-2 font-normal">
                      <RadioGroupItem value={y} /> {y} yr{y !== "1" && "s"}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="msg">Message to landlord</Label>
              <Textarea
                id="msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Introduce yourself: your work, who'll be living with you, and why this home suits you."
                aria-invalid={!!error}
                aria-describedby={error ? "msg-error" : undefined}
              />
              {error && (
                <p id="msg-error" className="text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">Attach from your rental profile</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {DOCS.map((d) => (
                  <Label key={d} className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 font-normal transition-colors has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5">
                    <Checkbox checked={docs.includes(d)} onCheckedChange={(c) => setDocs((prev) => (c ? [...prev, d] : prev.filter((x) => x !== d)))} />
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="text-[13px]">{d}</span>
                  </Label>
                ))}
              </div>
            </fieldset>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : <Send />}
                {submitting ? "Submittingâ€¦" : "Submit application"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}


