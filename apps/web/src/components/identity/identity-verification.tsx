"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, CircleCheck, Clock, FileText, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { IdentityDocument, IdentityDocumentKind, IdentityVerification } from "@/types";
import { useStore } from "renton-core/store";
import { useCurrentUser } from "renton-core/hooks";
import { ID_TYPES, IDENTITY_REQUIREMENTS, IDENTITY_STATUS_META, identityStatus, missingDocuments } from "renton-core/identity";
import { PageHeader } from "renton-ui/dashboard/widgets";
import { ReceiptPicker, type ReceiptFile } from "renton-ui/payments/payment-parts";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "renton-ui/ui/card";
import { Checkbox } from "renton-ui/ui/checkbox";
import { Input } from "renton-ui/ui/input";
import { Label } from "renton-ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "renton-ui/ui/select";
import { formatDate, sleep } from "renton-core/utils";

type IdType = NonNullable<IdentityVerification["idType"]>;

const ID_NUMBER_RULE: Record<IdType, { pattern: RegExp; hint: string }> = {
  NIN: { pattern: /^\d{11}$/, hint: "11 digits" },
  "International Passport": { pattern: /^[A-Z]\d{8}$/i, hint: "A letter followed by 8 digits" },
  "Driver's Licence": { pattern: /^[A-Z0-9]{8,14}$/i, hint: "8â€“14 letters and numbers" },
  "Voter's Card": { pattern: /^[A-Z0-9]{9,20}$/i, hint: "VIN, 9â€“20 letters and numbers" },
};

export function IdentityVerificationPage({ role }: { role: "tenant" | "landlord" }) {
  const user = useCurrentUser();
  const [editing, setEditing] = useState(false);
  if (!user) return null;
  const status = identityStatus(user);
  const showForm = status === "unverified" || status === "rejected" || editing;

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Verify your identity"
        description={
          role === "tenant"
            ? "We check every tenant so landlords can trust your application."
            : "We check every landlord so tenants know they're dealing with the real owner."
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {status === "rejected" && user.identity?.rejectionReason && (
            <div className="flex gap-3 rounded-2xl border border-destructive/25 bg-destructive/[0.06] p-4 text-sm">
              <ShieldAlert className="size-5 shrink-0 text-destructive" />
              <p>
                <span className="font-semibold">Your last submission was declined:</span> {user.identity.rejectionReason}
              </p>
            </div>
          )}
          {showForm ? (
            <IdentityForm role={role} initial={user.identity} onDone={() => setEditing(false)} />
          ) : (
            <SubmissionSummary identity={user.identity} verifiedWithoutSubmission={!user.identity} onEdit={status === "pending" ? () => setEditing(true) : undefined} />
          )}
        </div>
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What we&apos;ll ask for</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                {IDENTITY_REQUIREMENTS[role].map((r) => (
                  <li key={r.kind} className="flex gap-2.5">
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>
                      <span className="font-medium">{r.label}</span>
                      {r.optional && <span className="text-muted-foreground"> (optional)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <p className="flex gap-2 px-1 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-success" />
            Your documents are only seen by the renton verification team. They are never shared with {role === "tenant" ? "landlords" : "tenants"}.
          </p>
        </aside>
      </div>
    </>
  );
}

function SubmissionSummary({ identity, verifiedWithoutSubmission, onEdit }: { identity?: IdentityVerification; verifiedWithoutSubmission: boolean; onEdit?: () => void }) {
  const role = useStore((s) => s.role);
  const status = identity?.status ?? "verified";
  const meta = IDENTITY_STATUS_META[status];
  const reqs = role === "tenant" || role === "landlord" ? IDENTITY_REQUIREMENTS[role] : [];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            {status === "verified" ? <BadgeCheck className="size-5 text-success" /> : <Clock className="size-5 text-amber-500" />}
            {status === "verified" ? "You're verified" : "Documents under review"}
          </CardTitle>
          <CardDescription className="mt-1">
            {status === "verified"
              ? identity?.reviewedAt
                ? `Confirmed on ${formatDate(identity.reviewedAt)}. A verified badge shows on your profile.`
                : "Your identity has been confirmed."
              : `Submitted ${identity?.submittedAt ? formatDate(identity.submittedAt) : ""}. We'll notify you once a reviewer has checked them, usually within 24 hours.`}
          </CardDescription>
        </div>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </CardHeader>
      {!verifiedWithoutSubmission && identity && (
        <CardContent className="space-y-3">
          {identity.idType && (
            <p className="text-sm text-muted-foreground">
              {identity.idType} Â· <span className="font-mono">{identity.idNumber}</span>
            </p>
          )}
          <ul className="divide-y rounded-xl border">
            {identity.documents.map((d) => (
              <li key={d.kind} className="flex items-center gap-3 p-3 text-sm">
                <CircleCheck className="size-4 shrink-0 text-success" />
                <span className="flex-1 font-medium">{reqs.find((r) => r.kind === d.kind)?.label ?? d.kind}</span>
                <span className="truncate text-xs text-muted-foreground">{d.name}</span>
              </li>
            ))}
          </ul>
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              Replace documents
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function IdentityForm({ role, initial, onDone }: { role: "tenant" | "landlord"; initial?: IdentityVerification; onDone: () => void }) {
  const submitIdentity = useStore((s) => s.submitIdentity);
  const [idType, setIdType] = useState<IdType>(initial?.idType ?? "NIN");
  const [idNumber, setIdNumber] = useState(initial?.idNumber ?? "");
  // Rejected documents have to be uploaded again, so start empty.
  const [files, setFiles] = useState<Partial<Record<IdentityDocumentKind, ReceiptFile>>>(() =>
    initial?.status === "pending" ? Object.fromEntries(initial.documents.map((d) => [d.kind, { name: d.name, kind: d.fileKind, url: d.url }])) : {}
  );
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const requirements = IDENTITY_REQUIREMENTS[role];
  const missing = missingDocuments(role, Object.keys(files) as IdentityDocumentKind[]);
  const rule = ID_NUMBER_RULE[idType];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const number = idNumber.replace(/\s+/g, "").toUpperCase();
    if (!rule.pattern.test(number)) return setError(`Check your ${idType} number (${rule.hint}).`);
    if (missing.length) return setError(`Upload your ${missing.map((m) => m.label.toLowerCase()).join(" and ")}.`);
    if (!consent) return setError("Please confirm the documents are genuine.");
    setError(undefined);
    setSubmitting(true);
    await sleep(900);
    const documents: IdentityDocument[] = requirements.flatMap((r) => {
      const f = files[r.kind];
      return f ? [{ kind: r.kind, name: f.name, fileKind: f.kind, url: f.url, uploadedAt: new Date().toISOString() }] : [];
    });
    submitIdentity({ idType, idNumber: number, documents });
    setSubmitting(false);
    toast.success("Documents submitted", { description: "We'll notify you once you're verified." });
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>1. Your ID details</CardTitle>
          <CardDescription>Use the same ID you upload below.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="id-type">ID type</Label>
            <Select value={idType} onValueChange={(v) => setIdType(v as IdType)}>
              <SelectTrigger id="id-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ID_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="id-number">{idType} number</Label>
            <Input id="id-number" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder={rule.hint} autoComplete="off" inputMode={idType === "NIN" ? "numeric" : "text"} />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>2. Upload documents</CardTitle>
          <CardDescription>Clear photos or PDFs, max 10MB each.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {requirements.map((r) => (
            <div key={r.kind} className="grid gap-2">
              <div>
                <p className="text-sm font-medium">
                  {r.label} {r.optional && <span className="font-normal text-muted-foreground">(optional)</span>}
                </p>
                <p className="text-xs text-muted-foreground">{r.hint}</p>
              </div>
              <ReceiptPicker
                value={files[r.kind] ?? null}
                onChange={(f) =>
                  setFiles((prev) => {
                    const next = { ...prev };
                    if (f) next[r.kind] = f;
                    else delete next[r.kind];
                    return next;
                  })
                }
                title={`Upload ${r.label.toLowerCase()}`}
                hint="Photo, scan or PDF Â· max 10MB"
                what="document"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 space-y-4">
        <Label className="flex items-start gap-3 font-normal">
          <Checkbox checked={consent} onCheckedChange={(c) => setConsent(c === true)} className="mt-0.5" />
          <span className="text-sm">I confirm these documents are genuine and belong to me, and I agree to renton checking them with the issuing authorities.</span>
        </Label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <Button asChild variant="ghost">
            <Link href={`/${role}`}>Do this later</Link>
          </Button>
          <Button type="submit" size="lg" disabled={submitting} className="sm:ml-auto">
            {submitting && <Loader2 className="animate-spin" />}
            {submitting ? "Submittingâ€¦" : "Submit for verification"}
          </Button>
        </div>
      </div>
    </form>
  );
}


