"use client";

import { useState } from "react";
import { Download, FileCheck2, FileSignature, Loader2, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import type { PaymentInvoice } from "@/types";
import { useStore } from "renton-core/store";
import { downloadPaymentReceipt, downloadTenancyAgreement } from "@/lib/documents";
import { Button } from "renton-ui/ui/button";
import { formatDate, formatNaira } from "renton-core/utils";

function DocRow({ icon: Icon, title, meta, onDownload }: { icon: typeof FileCheck2; title: string; meta: string; onDownload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onDownload();
          } catch (e) {
            console.error(e);
            toast.error("Couldn't generate the PDF. Please try again.");
          }
          setBusy(false);
        }}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Download />} PDF
      </Button>
    </div>
  );
}

/** Tenancy agreements and payment receipts for every verified move-in payment. */
export function TenancyDocuments({ invoices }: { invoices: PaymentInvoice[] }) {
  const leases = useStore((s) => s.leases);
  const properties = useStore((s) => s.properties);
  const users = useStore((s) => s.users);
  const verified = invoices.filter((i) => i.status === "verified").sort((a, b) => +new Date(b.verifiedAt ?? 0) - +new Date(a.verifiedAt ?? 0));

  if (verified.length === 0)
    return <p className="text-sm text-muted-foreground">Your tenancy agreement and payment receipt will appear here once renton verifies your move-in payment.</p>;

  return (
    <div className="space-y-5">
      {verified.map((inv) => {
        const lease = leases.find((l) => l.id === inv.leaseId);
        const property = properties.find((p) => p.id === inv.propertyId);
        const tenant = users.find((u) => u.id === inv.tenantId);
        const landlord = users.find((u) => u.id === inv.landlordId);
        if (!lease || !property || !tenant || !landlord) return null;
        const ctx = { invoice: inv, lease, property, tenant, landlord };
        return (
          <div key={inv.id}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {property.title} Â· {property.city}
            </p>
            <div className="space-y-2">
              <DocRow
                icon={FileSignature}
                title="Tenancy agreement"
                meta={`${inv.agreementNumber} Â· ${formatDate(lease.leaseStart)} â€“ ${formatDate(lease.leaseEnd)}`}
                onDownload={() => downloadTenancyAgreement(ctx)}
              />
              <DocRow
                icon={ReceiptText}
                title="Payment receipt"
                meta={`${inv.receiptNumber} Â· ${formatNaira(inv.total)} Â· verified ${formatDate(inv.verifiedAt!)}`}
                onDownload={() => downloadPaymentReceipt(ctx)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}


