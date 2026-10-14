"use client";

import { ZoneLink as Link } from "renton-ui/zone-link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, BadgeCheck, CalendarCheck, Check, Download, Eye, FileImage, FileText, Flag, Globe, MapPin, Send, TriangleAlert, UserRound } from "lucide-react";
import { toast } from "sonner";
import type { DocumentStatus, LandlordProfile } from "renton-shared/types";
import { useStore } from "renton-core/store";
import { PageHeader, UserAvatar } from "renton-ui/dashboard/widgets";
import { VerificationActions } from "@/components/verification-actions";
import { VerificationBadge } from "renton-ui/property/verification-badge";
import { VerificationFlow } from "renton-ui/shared/verification-flow";
import { SafeImage } from "renton-ui/shared/safe-image";
import { EmptyState } from "renton-ui/shared/states";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "renton-ui/ui/card";
import { Checkbox } from "renton-ui/ui/checkbox";
import { Progress } from "renton-ui/ui/progress";
import { Textarea } from "renton-ui/ui/textarea";
import { cn, formatDate, formatNaira, timeAgo } from "renton-core/utils";

const DOC_META: Record<DocumentStatus, { label: string; variant: "success" | "warning" | "destructive" }> = {
  verified: { label: "Verified", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  flagged: { label: "Flagged", variant: "destructive" },
};

export default function PropertyReviewPage() {
  const { id } = useParams<{ id: string }>();
  const v = useStore((s) => s.verifications.find((x) => x.id === id));
  const p = useStore((s) => s.properties.find((x) => x.id === v?.propertyId));
  const landlord = useStore((s) => s.users.find((u) => u.id === p?.landlordId)) as LandlordProfile | undefined;
  const toggle = useStore((s) => s.toggleChecklistItem);
  const addNote = useStore((s) => s.addVerificationNote);
  const setDoc = useStore((s) => s.setDocumentStatus);
  const [note, setNote] = useState("");

  if (!v || !p) {
    return <EmptyState icon={Flag} title="Verification request not found" description="It may have been removed or the link is incorrect." action={{ label: "Back to queue", href: "/admin/verifications" }} />;
  }

  const done = v.checklist.filter((c) => c.done).length;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
        <Link href="/admin/verifications">
          <ArrowLeft /> Verification queue
        </Link>
      </Button>
      <PageHeader
        eyebrow={`Request ${v.id.toUpperCase()} · submitted ${timeAgo(v.submittedAt)}`}
        title={p.title}
        description={`${p.address}, ${p.area}, ${p.city}`}
        actions={<VerificationActions propertyId={p.id} stage={p.verification} title={p.title} size="default" />}
      />

      <Card className="mb-6 p-5 sm:p-6">
        <VerificationFlow stage={p.verification} />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                {[
                  ["Type", p.type],
                  ["Bedrooms / Baths", `${p.bedrooms} / ${p.bathrooms}`],
                  ["Floor area", `${p.sizeSqm} m²`],
                  ["Annual rent", formatNaira(p.rent)],
                  ["Service charge", formatNaira(p.serviceCharge)],
                  ["Power", p.power],
                  ["Water", p.waterSupply],
                  ["Parking", `${p.parkingSpaces} spaces`],
                  ["Listed", formatDate(p.listedAt)],
                ].map(([k, val]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{val}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.amenities.map((a) => (
                  <span key={a} className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs">
                    {a}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Uploaded documents</CardTitle>
                <CardDescription>Cross-check against land registry and identity databases.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {v.documents.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>}
              {v.documents.map((d) => {
                const meta = DOC_META[d.status];
                const Icon = d.name.endsWith(".pdf") ? FileText : FileImage;
                return (
                  <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
                      <Icon className="size-5 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.kind} · {(d.sizeKb / 1024).toFixed(1)} MB · {formatDate(d.uploadedAt)}
                      </p>
                    </div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <div className="flex gap-1">
                      <Button size="icon-sm" variant="ghost" aria-label={`Preview ${d.name}`} onClick={() => toast("Document preview opens in the secure viewer")}>
                        <Eye className="size-4" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label={`Download ${d.name}`} onClick={() => toast("Download started")}>
                        <Download className="size-4" />
                      </Button>
                      {d.status !== "verified" && (
                        <Button size="icon-sm" variant="ghost" className="text-success" aria-label={`Mark ${d.name} verified`} onClick={() => setDoc(v.id, d.id, "verified")}>
                          <Check className="size-4" />
                        </Button>
                      )}
                      {d.status !== "flagged" && (
                        <Button size="icon-sm" variant="ghost" className="text-destructive" aria-label={`Flag ${d.name}`} onClick={() => setDoc(v.id, d.id, "flagged")}>
                          <Flag className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uploaded images</CardTitle>
              <CardDescription>Compare listing photos with the field officer&apos;s inspection photos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {p.images.map((src, i) => (
                  <div key={src + i} className="relative aspect-[4/3] overflow-hidden rounded-xl border">
                    <SafeImage src={src} alt={`Listing photo ${i + 1}`} fill sizes="(max-width: 640px) 50vw, 25vw" />
                    <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{i === 0 ? "Cover" : `Photo ${i + 1}`}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verification checklist</CardTitle>
              <div className="flex items-center gap-3 pt-1">
                <Progress value={(done / v.checklist.length) * 100} className="h-2 flex-1" indicatorClassName="bg-success" />
                <span className="text-xs font-medium">
                  {done}/{v.checklist.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {v.checklist.map((c) => (
                <label key={c.id} className={cn("flex cursor-pointer gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/60", c.done && "opacity-80")}>
                  <Checkbox checked={c.done} onCheckedChange={() => toggle(v.id, c.id)} className="mt-0.5" />
                  <span>
                    <span className={cn("block text-sm font-medium", c.done && "line-through decoration-muted-foreground/50")}>{c.label}</span>
                    <span className="block text-xs text-muted-foreground">{c.description}</span>
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>

          {v.riskFlags.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="space-y-2 pt-5 sm:pt-6">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                  <TriangleAlert className="size-4" /> Risk flags
                </p>
                {v.riskFlags.map((r) => (
                  <p key={r} className="text-sm">
                    • {r}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Landlord</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {landlord && (
                <div className="flex items-center gap-3">
                  <UserAvatar name={landlord.name} hue={landlord.avatarHue} />
                  <div>
                    <p className="flex items-center gap-1 font-medium">
                      {landlord.name} {landlord.identityVerified && <BadgeCheck className="size-4 text-success" />}
                    </p>
                    <p className="text-xs text-muted-foreground">{landlord.email}</p>
                  </div>
                </div>
              )}
              {landlord?.isDiaspora && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="size-4" /> Diaspora · {landlord.residence}
                </p>
              )}
              {v.inspector && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="size-4" /> Inspector: {v.inspector}
                </p>
              )}
              {v.inspectionDate && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <CalendarCheck className="size-4" /> Inspection: {formatDate(v.inspectionDate)}
                </p>
              )}
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4" /> {p.area}, {p.city}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verification notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {v.notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
              <ol className="space-y-3">
                {v.notes.map((n) => (
                  <li key={n.id} className="rounded-xl bg-muted/60 p-3">
                    <p className="text-sm">{n.body}</p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {n.author} · {timeAgo(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!note.trim()) return;
                  addNote(v.id, note.trim());
                  setNote("");
                  toast.success("Note added");
                }}
                className="space-y-2"
              >
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note…" rows={3} aria-label="New note" />
                <Button type="submit" size="sm" className="w-full" disabled={!note.trim()}>
                  <Send /> Add note
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
