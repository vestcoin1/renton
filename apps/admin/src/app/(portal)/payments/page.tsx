"use client";

import { useState } from "react";
import { AlertTriangle, BadgeCheck, CircleCheck, CreditCard, Hourglass, Loader2, ReceiptText, X } from "lucide-react";
import { toast } from "sonner";
import type { PaymentInvoice, PaymentStatus } from "renton-shared/types";
import { useStore } from "renton-core/store";
import { PageHeader, StatCard, UserAvatar } from "renton-ui/dashboard/widgets";
import { EmptyState } from "renton-ui/shared/states";
import { SafeImage } from "renton-ui/shared/safe-image";
import { InvoiceBreakdown, PAYMENT_STATUS, ReceiptPreview } from "renton-ui/payments/payment-parts";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card } from "renton-ui/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "renton-ui/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "renton-ui/ui/tabs";
import { Textarea } from "renton-ui/ui/textarea";
import { cn, formatDate, formatNaira, sleep, timeAgo } from "renton-core/utils";

const TABS: { value: PaymentStatus; label: string }[] = [
  { value: "submitted", label: "To verify" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "rejected", label: "Rejected" },
  { value: "verified", label: "Verified" },
];

const REJECT_REASONS = [
  "We couldn't find this transfer in our account.",
  "The amount paid is less than the total due.",
  "The receipt is unclear or incomplete.",
  "The payment reference doesn't match your invoice.",
];

function VerifyActions({ invoice, onDone }: { invoice: PaymentInvoice; onDone: () => void }) {
  const verify = useStore((s) => s.verifyPayment);
  const reject = useStore((s) => s.rejectPayment);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (rejecting)
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {REJECT_REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)} className={cn("rounded-full border px-2.5 py-1 text-xs", reason === r ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40")}>
              {r}
            </button>
          ))}
        </div>
        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason shared with the tenant" aria-label="Rejection reason" />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setRejecting(false)}>
            Back
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            onClick={() => {
              reject(invoice.id, reason.trim());
              toast("Payment rejected", { description: "The tenant has been asked to upload a new receipt." });
              onDone();
            }}
          >
            <X /> Reject payment
          </Button>
        </div>
      </div>
    );

  return (
    <div className="space-y-2">
      <Button
        variant="success"
        className="w-full"
        size="lg"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await sleep(900);
          verify(invoice.id);
          setBusy(false);
          toast.success("Payment verified", { description: "Lease created, documents issued and the property marked occupied." });
          onDone();
        }}
      >
        {busy ? <Loader2 className="animate-spin" /> : <BadgeCheck />} Confirm payment received
      </Button>
      <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setRejecting(true)}>
        <X /> Reject
      </Button>
      <p className="text-center text-xs text-muted-foreground">Confirming creates the lease, issues the tenancy agreement and receipt, and marks the home occupied.</p>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const invoices = useStore((s) => s.invoices);
  const properties = useStore((s) => s.properties);
  const users = useStore((s) => s.users);
  const [tab, setTab] = useState<PaymentStatus>("submitted");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const byId = new Map(properties.map((p) => [p.id, p]));
  const usersById = new Map(users.map((u) => [u.id, u]));
  const selected = invoices.find((i) => i.id === selectedId) ?? null;
  const list = invoices.filter((i) => i.status === tab).sort((a, b) => +new Date(b.receipt?.uploadedAt ?? b.createdAt) - +new Date(a.receipt?.uploadedAt ?? a.createdAt));
  const count = (st: PaymentStatus) => invoices.filter((i) => i.status === st).length;
  const collected = invoices.filter((i) => i.status === "verified").reduce((n, i) => n + i.total, 0);

  const sp = selected ? byId.get(selected.propertyId) : undefined;
  const st = selected ? usersById.get(selected.tenantId) : undefined;
  const mismatch = selected?.receipt && selected.receipt.amountPaid !== selected.total;

  return (
    <>
      <PageHeader title="Payments" description="Verify move-in payments from approved tenants. Verification starts the tenancy." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Receipts to verify" value={count("submitted")} icon={ReceiptText} tone="blue" />
        <StatCard index={1} label="Awaiting payment" value={count("awaiting_payment")} icon={Hourglass} tone="amber" />
        <StatCard index={2} label="Rejected" value={count("rejected")} icon={AlertTriangle} tone="rose" />
        <StatCard index={3} label="Collected" value={formatNaira(collected)} icon={CircleCheck} tone="emerald" />
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as PaymentStatus)} className="mb-5">
        <TabsList className="h-auto flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label} <span className="text-[11px] text-muted-foreground">{count(t.value)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {list.length === 0 ? (
        <EmptyState icon={CreditCard} title="Nothing here" description="Payments appear here as landlords approve tenants and tenants upload receipts." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((i) => {
            const p = byId.get(i.propertyId);
            const t = usersById.get(i.tenantId);
            const off = i.receipt && i.receipt.amountPaid !== i.total;
            return (
              <Card
                key={i.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(i.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedId(i.id)}
                className="group flex cursor-pointer gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                  {p && <SafeImage src={p.images[0]} alt="" fill sizes="80px" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold group-hover:text-primary">{t?.name}</p>
                    <Badge variant={PAYMENT_STATUS[i.status].variant}>{PAYMENT_STATUS[i.status].label}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {p?.title} Â· {p?.area}
                  </p>
                  <p className="mt-2 font-display text-lg font-bold">{formatNaira(i.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    Ref {i.reference} Â· {i.receipt ? `receipt ${timeAgo(i.receipt.uploadedAt)}` : `due ${formatDate(i.dueDate)}`}
                    {off && <span className="ml-1 font-medium text-amber-600">Â· amount differs</span>}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="gap-0 p-0 sm:max-w-xl">
          {selected && sp && st && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <Badge variant={PAYMENT_STATUS[selected.status].variant}>{PAYMENT_STATUS[selected.status].label}</Badge>
                  <span className="text-xs text-muted-foreground">Ref {selected.reference}</span>
                </div>
                <SheetTitle className="pt-1">{formatNaira(selected.total)} move-in payment</SheetTitle>
                <SheetDescription>
                  {sp.title} Â· {sp.area}, {sp.city}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto p-6">
                <div className="flex items-center gap-3 rounded-xl border p-3">
                  <UserAvatar name={st.name} hue={st.avatarHue} />
                  <div className="min-w-0">
                    <p className="font-medium">{st.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {st.email} Â· {st.phone}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">Invoice</p>
                  <InvoiceBreakdown invoice={selected} className="rounded-xl border bg-subtle p-4" />
                </div>
                {selected.receipt ? (
                  <div>
                    <p className="mb-2 text-sm font-semibold">Uploaded receipt</p>
                    <dl className="mb-3 grid grid-cols-3 gap-2 text-sm">
                      <div className={cn("rounded-lg p-2.5", mismatch ? "bg-amber-500/10" : "bg-muted/60")}>
                        <dt className="text-xs text-muted-foreground">Amount paid</dt>
                        <dd className="font-semibold">{formatNaira(selected.receipt.amountPaid)}</dd>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-2.5">
                        <dt className="text-xs text-muted-foreground">Date paid</dt>
                        <dd className="font-semibold">{formatDate(selected.receipt.paidOn)}</dd>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-2.5">
                        <dt className="text-xs text-muted-foreground">From</dt>
                        <dd className="truncate font-semibold">{selected.receipt.payerBank}</dd>
                      </div>
                    </dl>
                    {mismatch && (
                      <p className="mb-3 flex items-center gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                        <AlertTriangle className="size-4" /> Paid amount differs from the invoice by {formatNaira(Math.abs(selected.total - selected.receipt.amountPaid))}.
                      </p>
                    )}
                    <ReceiptPreview receipt={selected.receipt} />
                    <p className="mt-2 text-xs text-muted-foreground">Check the bank statement for a credit matching the amount and reference before confirming.</p>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">The tenant hasn&apos;t uploaded a receipt yet. Payment is due {formatDate(selected.dueDate)}.</p>
                )}
                {selected.status === "verified" && (
                  <p className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-3 text-sm">
                    <CircleCheck className="size-4 text-success" /> Verified by {selected.verifiedBy} on {formatDate(selected.verifiedAt!)} Â· receipt {selected.receiptNumber}
                  </p>
                )}
                {selected.status === "rejected" && <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">Rejected: {selected.rejectionReason}</p>}
              </div>
              {selected.status === "submitted" && (
                <div className="border-t bg-subtle p-4">
                  <VerifyActions key={selected.id} invoice={selected} onDone={() => setSelectedId(null)} />
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}


