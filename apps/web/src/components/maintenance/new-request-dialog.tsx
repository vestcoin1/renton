"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import type { Lease, MaintenanceCategory, MaintenanceMedia, MaintenanceUrgency } from "@/types";
import { useStore } from "renton-core/store";
import { Button } from "renton-ui/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "renton-ui/ui/dialog";
import { Input } from "renton-ui/ui/input";
import { Label } from "renton-ui/ui/label";
import { Textarea } from "renton-ui/ui/textarea";
import { MediaUploader } from "renton-ui/maintenance/media";
import { CATEGORIES, URGENCY } from "renton-ui/maintenance/meta";
import { cn, sleep } from "renton-core/utils";

const ROOMS = ["Kitchen", "Living room", "Master bedroom", "Bedroom 2", "Bathroom", "Toilet", "Balcony", "Compound", "Whole apartment"];

export function NewRepairDialog({ lease, children }: { lease: Lease; children: React.ReactNode }) {
  const create = useStore((s) => s.createMaintenanceRequest);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<MaintenanceCategory | null>(null);
  const [urgency, setUrgency] = useState<MaintenanceUrgency>("medium");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("Kitchen");
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState<MaintenanceMedia[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setCategory(null);
    setUrgency("medium");
    setTitle("");
    setLocation("Kitchen");
    setDescription("");
    setMedia([]);
    setErrors({});
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!category) err.category = "Choose what kind of problem this is.";
    if (title.trim().length < 5) err.title = "Add a short title (e.g. â€œShower has no hot waterâ€).";
    if (description.trim().length < 15) err.description = "Describe the problem in a bit more detail.";
    if (media.length === 0) err.media = "Add at least one photo or video so we can assess it faster.";
    setErrors(err);
    if (Object.keys(err).length) return;
    setSaving(true);
    await sleep(900);
    create({ leaseId: lease.id, category: category!, urgency, title: title.trim(), location, description: description.trim(), media });
    setSaving(false);
    setOpen(false);
    reset();
    toast.success("Repair request submitted", { description: "renton will investigate and update you within 24 hours." });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Request a repair</DialogTitle>
            <DialogDescription>We&apos;ll investigate, get your landlord&apos;s approval, and send a vetted technician.</DialogDescription>
          </DialogHeader>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">What&apos;s the problem?</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={category === c.value}
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center text-[11px] font-medium leading-tight transition-all",
                    category === c.value ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20" : "hover:border-primary/40"
                  )}
                >
                  <c.icon className="size-5" />
                  {c.value}
                </button>
              ))}
            </div>
            {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <div className="grid gap-2">
              <Label htmlFor="r-title">Title</Label>
              <Input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Shower has no hot water" aria-invalid={!!errors.title} />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="r-room">Where?</Label>
              <select
                id="r-room"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {ROOMS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="r-desc">Describe the problem</Label>
            <Textarea
              id="r-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When did it start? What have you noticed? Is it getting worse?"
              aria-invalid={!!errors.description}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">How urgent is it?</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(URGENCY) as MaintenanceUrgency[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={urgency === u}
                  onClick={() => setUrgency(u)}
                  className={cn("rounded-xl border p-2.5 text-left transition-all", urgency === u ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/40")}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className={cn("size-2 rounded-full", URGENCY[u].dot)} /> {URGENCY[u].label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">{URGENCY[u].hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-2">
            <p className="text-sm font-medium">Photos &amp; videos</p>
            <MediaUploader value={media} onChange={setMedia} />
            {errors.media && <p className="text-xs text-destructive">{errors.media}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Send />} Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


