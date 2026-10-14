"use client";

import { useState } from "react";
import { CircleCheck, FileText, ShieldX } from "lucide-react";
import { toast } from "sonner";
import type { IdentityDocument, User } from "renton-shared/types";
import { useStore } from "renton-core/store";
import { IDENTITY_REQUIREMENTS, IDENTITY_STATUS_META, identityStatus } from "renton-core/identity";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Textarea } from "renton-ui/ui/textarea";
import { formatDate } from "renton-core/utils";

const REJECT_REASONS = ["The ID photo is blurry or cropped.", "The name on the documents doesn't match the account.", "The document has expired.", "The selfie doesn't match the ID."];

function DocumentPreview({ doc }: { doc: IdentityDocument }) {
  if (doc.fileKind === "image")
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded document (data URL)
      <img src={doc.url} alt={doc.name} className="max-h-56 w-full rounded-lg border bg-muted object-contain" />
    );
  return <iframe src={doc.url} title={doc.name} className="h-56 w-full rounded-lg border bg-muted" />;
}

/** Identity section of the admin user drawer: the submitted documents plus approve/reject. */
export function IdentityReview({ user }: { user: User }) {
  const reviewIdentity = useStore((s) => s.reviewIdentity);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const status = identityStatus(user);
  const meta = IDENTITY_STATUS_META[status];
  const identity = user.identity;
  const reqs = user.role === "admin" ? [] : IDENTITY_REQUIREMENTS[user.role];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Identity verification</h3>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>

      {!identity?.documents.length ? (
        <p className="text-sm text-muted-foreground">
          {status === "verified" ? "Verified before document uploads were introduced." : "No documents submitted yet."}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {identity.idType} Â· <span className="font-mono text-foreground">{identity.idNumber}</span>
            {identity.submittedAt && <> Â· submitted {formatDate(identity.submittedAt)}</>}
          </p>
          <ul className="space-y-4">
            {reqs.map((r) => {
              const doc = identity.documents.find((d) => d.kind === r.kind);
              return (
                <li key={r.kind} className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <FileText className="size-4 text-muted-foreground" /> {r.label}
                    {!doc && <span className="font-normal text-muted-foreground">{r.optional ? "Â· not provided (optional)" : "Â· missing"}</span>}
                  </p>
                  {doc && <DocumentPreview doc={doc} />}
                </li>
              );
            })}
          </ul>
          {identity.reviewedAt && (
            <p className="text-xs text-muted-foreground">
              {status === "verified" ? "Approved" : "Rejected"} by {identity.reviewedBy} on {formatDate(identity.reviewedAt)}
              {identity.rejectionReason && `: ${identity.rejectionReason}`}
            </p>
          )}
        </>
      )}

      {status === "pending" &&
        (rejecting ? (
          <div className="space-y-2 rounded-xl border p-3">
            <p className="text-sm font-medium">Why are you rejecting this?</p>
            <div className="flex flex-wrap gap-1.5">
              {REJECT_REASONS.map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full border px-2.5 py-1 text-xs hover:border-primary/40 hover:bg-primary/5">
                  {r}
                </button>
              ))}
            </div>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="The user sees this message." rows={2} aria-label="Rejection reason" />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="ml-auto"
                disabled={reason.trim().length < 5}
                onClick={() => {
                  reviewIdentity(user.id, false, reason.trim());
                  toast(`${user.name} has been asked to re-upload`);
                  setRejecting(false);
                }}
              >
                <ShieldX /> Reject documents
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setRejecting(true)}>
              <ShieldX /> Reject
            </Button>
            <Button
              variant="success"
              onClick={() => {
                reviewIdentity(user.id, true);
                toast.success(`${user.name} is now verified`);
              }}
            >
              <CircleCheck /> Approve
            </Button>
          </div>
        ))}
    </section>
  );
}


