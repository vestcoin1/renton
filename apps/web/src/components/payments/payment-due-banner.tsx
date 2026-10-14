"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CreditCard } from "lucide-react";
import type { PaymentInvoice, Property } from "@/types";
import { Button } from "renton-ui/ui/button";
import { formatDate, formatNaira } from "renton-core/utils";

/** Prompts the tenant to pay move-in fees for any approved application. */
export function PaymentDueBanner({ invoices, byId }: { invoices: PaymentInvoice[]; byId: Map<string, Property> }) {
  const due = invoices.filter((i) => i.status === "awaiting_payment" || i.status === "rejected");
  if (!due.length) return null;
  return (
    <div className="mb-6 space-y-3">
      {due.map((inv) => {
        const p = byId.get(inv.propertyId);
        return (
          <motion.div
            key={inv.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 p-5 text-white shadow-lg shadow-emerald-900/10 sm:flex-row sm:items-center"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <CreditCard className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{inv.status === "rejected" ? "Please re-upload your payment receipt" : `You're approved for ${p?.title}! ðŸŽ‰`}</p>
              <p className="text-sm text-white/85">
                Pay {formatNaira(inv.total)} to renton (rent, caution deposit and 10% agency fee) by {formatDate(inv.dueDate)} to secure the home.
              </p>
            </div>
            <Button asChild variant="white" className="text-emerald-700">
              <Link href="/tenant/payments">
                Pay now <ArrowRight />
              </Link>
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}


