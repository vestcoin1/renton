"use client";

import { useState } from "react";
import { Check, MessageSquareWarning, X } from "lucide-react";
import { toast } from "sonner";
import type { VerificationStage } from "renton-shared/types";
import { useStore } from "renton-core/store";
import { nextStage } from "renton-core/status";
import { Button } from "renton-ui/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "renton-ui/ui/dialog";
import { Label } from "renton-ui/ui/label";
import { Textarea } from "renton-ui/ui/textarea";
import { cn } from "renton-core/utils";

const APPROVE_LABEL: Partial<Record<VerificationStage, string>> = {
  submitted: "Schedule inspection",
  inspection_scheduled: "Mark inspected",
  under_review: "Approve & publish",
  verified: "Publish",
  changes_requested: "Re-open review",
};

const REJECT_REASONS = ["Title documents could not be authenticated", "Owner identity mismatch", "Photos do not match property", "Duplicate or fraudulent listing"];
const CHANGE_REASONS = ["Upload a clearer copy of the title document", "Provide notarised power of attorney", "Replace stock photos with real photos", "Correct the listed address"];

export function VerificationActions({ propertyId, stage, size = "sm", className, title }: { propertyId: string; stage: VerificationStage; size?: "sm" | "default"; className?: string; title: string }) {
  const setStage = useStore((s) => s.setVerificationStage);
  const [mode, setMode] = useState<"reject" | "changes" | null>(null);
  const [note, setNote] = useState("");
  const closed = stage === "published" || stage === "rejected";

  const approve = () => {
    const target: VerificationStage | null = stage === "under_review" ? "published" : nextStage(stage);
    if (!target) return;
    setStage(propertyId, target);
    toast.success(target === "published" ? "Verified & published" : `Moved to ${target.replace("_", " ")}`, {
      description: target === "published" ? `${title} is now live with a Verified badge.` : "The landlord has been notified.",
    });
  };

  const confirm = () => {
    if (!mode) return;
    setStage(propertyId, mode === "reject" ? "rejected" : "changes_requested", note.trim() || undefined);
    toast(mode === "reject" ? "Listing rejected" : "Changes requested", { description: "The landlord has been notified with your note." });
    setMode(null);
    setNote("");
  };

  if (closed) return null;

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        <Button size={size} variant="success" onClick={approve}>
          <Check /> {APPROVE_LABEL[stage] ?? "Approve"}
        </Button>
        <Button size={size} variant="outline" onClick={() => setMode("changes")}>
          <MessageSquareWarning /> Request changes
        </Button>
        <Button size={size} variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setMode("reject")}>
          <X /> Reject
        </Button>
      </div>
      <Dialog open={!!mode} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "reject" ? "Reject listing" : "Request changes"}</DialogTitle>
            <DialogDescription>{title}. Your note will be sent to the landlord.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {(mode === "reject" ? REJECT_REASONS : CHANGE_REASONS).map((r) => (
              <button key={r} type="button" onClick={() => setNote(r)} className={cn("rounded-full border px-3 py-1.5 text-xs transition-colors", note === r ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40")}>
                {r}
              </button>
            ))}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="note">Note to landlord</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain what needs to happen nextâ€¦" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button variant={mode === "reject" ? "destructive" : "default"} onClick={confirm} disabled={!note.trim()}>
              {mode === "reject" ? "Reject listing" : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


