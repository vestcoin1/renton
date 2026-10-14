"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CalendarClock, CircleCheck, CreditCard, Hourglass, Info, KeyRound, Loader2, MapPin, PiggyBank, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { PaymentInvoice } from "@/types";
import { useTenantData } from "renton-core/hooks";
import { useStore } from "renton-core/store";
import { PageHeader } from "renton-ui/dashboard/widgets";
import { EmptyState } from "renton-ui/shared/states";
import { SafeImage } from "renton-ui/shared/safe-image";
import { BankDetails, InvoiceBreakdown, PAYMENT_STATUS, ReceiptPicker, ReceiptPreview } from "renton-ui/payments/payment-parts";
import { TenancyDocuments } from "@/components/payments/tenancy-documents";
import { RentPlanPanel } from "renton-ui/payments/rent-plan";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "renton-ui/ui/card";
import { Input } from "renton-ui/ui/input";
import { Label } from "renton-ui/ui/label";
import { cn, formatDate, formatNaira, sleep } from "renton-core/utils";

const STEPS = ["Approved", "Pay renton", "Upload receipt", "We verify", "Move in"];
const STEP_INDEX = { awaiting_payment: 1, rejected: 2, submitted: 3, verified: 5 } as const;

function Steps({ status }: { status: PaymentInvoice["status"] }) {
  const current = STEP_INDEX[status];
  return (
    <ol className="flex items-center gap-1.5">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col gap-1.5">
          <span className={cn("h-1.5 rounded-full", i < current ? "bg-success" : i === current ? (status === "rejected" ? "bg-destructive" : "bg-primary") : "bg-muted")} />
          <span className={cn("hidden text-[11px] font-medium sm:block", i <= current ? "text-foreground" : "text-muted-foreground")}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

function PayForm({ invoice }: { invoice: PaymentInvoice }) {
  const submit = useStore((s) => s.submitPaymentReceipt);
  const [file, setFile] = useState<{ name: string; kind: "image" | "pdf"; url: string } | null>(null);
  const [amount, setAmount] = useState(String(invoice.total));
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [bank, setBank] = useState("");
  const [busy, setBusy] = useState(false);
  const paid = Number(amount.replace(/\D/g, "") || 0);
  const short = paid > 0 && paid < invoice.total;

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!file) return toast.error("Upload your transfer receipt first");
        if (!bank.trim()) return toast.error("Enter the bank you paid from");
        setBusy(true);
        await sleep(900);
        submit(invoice.id, { ...file, amountPaid: paid, paidOn: new Date(paidOn).toISOString(), payerBank: bank.trim() });
        setBusy(false);
        toast.success("Receipt submitted", { description: "We'll verify your payment within one business day." });
      }}
    >
      <ReceiptPicker value={file} onChange={setFile} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`amt-${invoice.id}`}>Amount paid</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">â‚¦</span>
            <Input id={`amt-${invoice.id}`} inputMode="numeric" className="pl-7" value={paid ? paid.toLocaleString("en-NG") : ""} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`date-${invoice.id}`}>Date paid</Label>
          <Input id={`date-${invoice.id}`} type="date" value={paidOn} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setPaidOn(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`bank-${invoice.id}`}>Paid from (bank)</Label>
          <Input id={`bank-${invoice.id}`} value={bank} onChange={(e) => setBank(e.target.value)} placeholder="e.g. GTBank" />
        </div>
      </div>
      {short && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> This is {formatNaira(invoice.total - paid)} less than the total due. Part-payments may delay verification.
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Send />} Submit payment for verification
      </Button>
    </form>
  );
}

function InvoiceCard({ invoice }: { invoice: PaymentInvoice }) {
  const { byId } = useTenantData();
  const property = byId.get(invoice.propertyId);
  const lease = useStore((s) => s.leases.find((l) => l.id === invoice.leaseId));
  const moveInFuture = lease ? new Date(lease.leaseStart) > new Date() : true;
  const meta = PAYMENT_STATUS[invoice.status];
  const daysLeft = Math.ceil((+new Date(invoice.dueDate) - Date.now()) / 86400000);
  if (!property) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center">
          <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl sm:w-36">
            <SafeImage src={property.images[0]} alt={property.title} fill sizes="150px" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={meta.variant}>{meta.tenantLabel}</Badge>
              <span className="text-xs text-muted-foreground">Ref {invoice.reference}</span>
            </div>
            <p className="mt-1 truncate text-lg font-semibold">{property.title}</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" /> {property.area}, {property.city}
            </p>
          </div>
          {(invoice.status === "awaiting_payment" || invoice.status === "rejected") && (
            <div className={cn("rounded-xl px-4 py-2 text-center", daysLeft <= 2 ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-300")}>
              <p className="font-display text-2xl font-bold">{Math.max(0, daysLeft)}</p>
              <p className="text-[11px] font-medium">day{daysLeft === 1 ? "" : "s"} to pay</p>
            </div>
          )}
        </div>

        <div className="space-y-5 p-5">
          <Steps status={invoice.status} />

          {invoice.status === "rejected" && invoice.rejectionReason && (
            <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <AlertTriangle className="size-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold">We couldn&apos;t verify your last receipt</p>
                <p className="text-sm text-muted-foreground">{invoice.rejectionReason}</p>
              </div>
            </div>
          )}

          {(invoice.status === "awaiting_payment" || invoice.status === "rejected") && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-semibold">What you&apos;re paying for</p>
                  <InvoiceBreakdown invoice={invoice} className="rounded-xl border bg-subtle p-4" />
                </div>
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" /> Service charge, if any, is paid separately to the estate. Pay by {formatDate(invoice.dueDate)} to secure the home.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-semibold">1. Transfer to renton</p>
                  <BankDetails amount={invoice.total} reference={invoice.reference} />
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5 text-success" /> Only pay into this renton account. Never pay a landlord or agent directly.
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">2. Upload your receipt</p>
                  <PayForm invoice={invoice} />
                </div>
              </div>
            </div>
          )}

          {invoice.status === "submitted" && invoice.receipt && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <Hourglass className="size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">We&apos;re verifying your payment</p>
                  <p className="text-sm text-muted-foreground">
                    You uploaded a receipt for {formatNaira(invoice.receipt.amountPaid)} on {formatDate(invoice.receipt.uploadedAt)}. We usually confirm within one business day, and
                    your tenancy agreement and receipt will then appear in your profile.
                  </p>
                </div>
              </div>
              <ReceiptPreview receipt={invoice.receipt} />
            </div>
          )}

          {invoice.status === "verified" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
                <CircleCheck className="size-5 shrink-0 text-success" />
                <div>
                  <p className="text-sm font-semibold">Payment verified Â· welcome home!</p>
                  <p className="text-sm text-muted-foreground">
                    {formatNaira(invoice.total)} confirmed on {formatDate(invoice.verifiedAt!)}.{" "}
                    {moveInFuture ? `Your keys will be handed over on ${lease ? formatDate(lease.leaseStart) : "your move-in date"}.` : `Your tenancy started on ${formatDate(lease!.leaseStart)}.`}
                  </p>
                  <Button asChild variant="link" className="h-auto px-0">
                    <Link href="/tenant/home">
                      <KeyRound /> Go to My Home <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </div>
              <TenancyDocuments invoices={[invoice]} />
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export default function TenantPaymentsPage() {
  const { invoices, lease, byId } = useTenantData();
  const sorted = [...invoices].sort((a, b) => {
    const rank = { awaiting_payment: 0, rejected: 0, submitted: 1, verified: 2 };
    return rank[a.status] - rank[b.status] || +new Date(b.createdAt) - +new Date(a.createdAt);
  });
  const home = lease ? byId.get(lease.propertyId) : undefined;

  return (
    <>
      <PageHeader title="Payments" description="Pay your rent to renton in installments, and pay move-in fees for new homes. We verify every payment and pay your landlord for you." />
      {lease && home && (
        <section id="rent" className="mb-8 scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="size-4 text-primary" /> Rent installments
              </CardTitle>
              <CardDescription>
                {lease.unit}, {home.area} Â· pay monthly or any amount you have. renton holds it and pays your landlord once the rent is complete.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RentPlanPanel lease={lease} />
            </CardContent>
          </Card>
        </section>
      )}
      {sorted.length > 0 && lease && <h2 className="mb-3 font-display text-lg font-semibold">Move-in payments</h2>}
      {sorted.length === 0 ? (
        lease ? null : (
          <EmptyState icon={CreditCard} title="No payments yet" description="When a landlord approves your application, your move-in invoice will appear here." action={{ label: "Find a home", href: "/properties" }} />
        )
      ) : (
        <div className="space-y-5">
          {sorted.map((i) => (
            <InvoiceCard key={i.id} invoice={i} />
          ))}
        </div>
      )}
      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5" /> Bank details shown are placeholders for this prototype.
      </p>
    </>
  );
}


