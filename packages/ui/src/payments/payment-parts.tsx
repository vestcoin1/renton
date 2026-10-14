"use client";

import { useRef, useState } from "react";
import { Check, Copy, FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { PaymentInvoice, PaymentReceiptUpload, PaymentStatus } from "renton-shared/types";
import type { BadgeProps } from "../ui/badge";
import { renton_ACCOUNT } from "renton-core/fees";
import { compressImage } from "../maintenance/media";
import { cn, formatNaira } from "renton-core/utils";

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tenantLabel: string; variant: NonNullable<BadgeProps["variant"]> }> = {
  awaiting_payment: { label: "Awaiting payment", tenantLabel: "Payment required", variant: "warning" },
  submitted: { label: "To verify", tenantLabel: "Verifying your payment", variant: "info" },
  verified: { label: "Verified", tenantLabel: "Paid", variant: "success" },
  rejected: { label: "Rejected", tenantLabel: "Re-upload receipt", variant: "destructive" },
};

export function InvoiceBreakdown({ invoice, className }: { invoice: PaymentInvoice; className?: string }) {
  return (
    <dl className={cn("space-y-2 text-sm", className)}>
      {invoice.items.map((i) => (
        <div key={i.key} className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{i.label}</dt>
          <dd className="font-medium tabular-nums">{formatNaira(i.amount)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t pt-2 text-base">
        <dt className="font-semibold">Total due</dt>
        <dd className="font-display font-bold tabular-nums">{formatNaira(invoice.total)}</dd>
      </div>
    </dl>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-semibold tabular-nums">{value}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            toast.error("Couldn't copy. Please copy it manually.");
          }
        }}
        className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function BankDetails({ amount, reference }: { amount?: number; reference: string }) {
  return (
    <div className="divide-y rounded-xl border bg-card px-4">
      {amount !== undefined && <CopyRow label="Amount" value={formatNaira(amount)} />}
      <CopyRow label="Account number" value={renton_ACCOUNT.accountNumber} />
      <div className="py-2">
        <p className="text-xs text-muted-foreground">Bank Â· Account name</p>
        <p className="font-semibold">
          {renton_ACCOUNT.bank} Â· {renton_ACCOUNT.accountName}
        </p>
      </div>
      <CopyRow label="Payment reference (use as narration)" value={reference} />
    </div>
  );
}

export type ReceiptFile = Pick<PaymentReceiptUpload, "name" | "kind" | "url">;

const MAX_PDF_INLINE = 900 * 1024;

/** Accepts a photo/screenshot (compressed) or PDF, e.g. a transfer receipt or an ID document. */
export function ReceiptPicker({
  value,
  onChange,
  title = "Upload your transfer receipt",
  hint = "Screenshot, photo or PDF Â· max 10MB",
  what = "receipt",
}: {
  value: ReceiptFile | null;
  onChange: (f: ReceiptFile | null) => void;
  title?: string;
  hint?: string;
  /** Noun used in validation messages and labels. */
  what?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    const isPdf = file.type === "application/pdf";
    if (!isPdf && !file.type.startsWith("image/")) return toast.error(`Upload an image or PDF of your ${what}`);
    if (file.size > 10 * 1024 * 1024) return toast.error(`The ${what} must be under 10MB`);
    setBusy(true);
    try {
      if (isPdf) {
        // Small PDFs are stored inline so they survive reloads in the demo.
        const url =
          file.size <= MAX_PDF_INLINE
            ? await new Promise<string>((res, rej) => {
                const r = new FileReader();
                r.onload = () => res(r.result as string);
                r.onerror = rej;
                r.readAsDataURL(file);
              })
            : URL.createObjectURL(file);
        onChange({ name: file.name, kind: "pdf", url });
      } else {
        onChange({ name: file.name, kind: "image", url: await compressImage(file, 1400, 0.8) });
      }
    } catch {
      toast.error("Couldn't read that file");
    }
    setBusy(false);
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border p-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {value.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data-URL preview
            <img src={value.url} alt={`${what} preview`} className="size-full object-cover" />
          ) : (
            <FileText className="size-6 text-destructive" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{value.name}</p>
          <p className="text-xs text-muted-foreground">{value.kind === "pdf" ? "PDF document" : "Image"} Â· ready to submit</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Remove ${what}`}>
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        pick(e.dataTransfer.files[0]);
      }}
      className={cn("flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 transition-all", drag ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-muted/40")}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{busy ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}</span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <input ref={input} type="file" accept="image/*,application/pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

/** Renders an uploaded receipt for review (image inline, PDF in a frame). */
export function ReceiptPreview({ receipt }: { receipt: PaymentReceiptUpload }) {
  if (receipt.kind === "image")
    return (
      <a href={receipt.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded receipt */}
        <img src={receipt.url} alt={`Receipt ${receipt.name}`} className="max-h-[420px] w-full object-contain" />
      </a>
    );
  return (
    <div className="overflow-hidden rounded-xl border">
      <iframe src={receipt.url} title={receipt.name} className="h-[420px] w-full bg-muted" />
      <a href={receipt.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 border-t p-3 text-sm font-medium text-primary hover:bg-muted/40">
        <FileText className="size-4" /> Open {receipt.name}
      </a>
    </div>
  );
}


