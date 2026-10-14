"use client";

import { ZoneLink as Link, useFullPathname } from "../zone-link";
import { motion } from "framer-motion";
import { ArrowRight, Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import { useCurrentUser } from "renton-core/hooks";
import { identityStatus, verifyPath } from "renton-core/identity";
import { Button } from "../ui/button";

const COPY = {
  tenant: {
    title: "Verify your identity to start applying for homes",
    body: "Landlords only accept applications from verified tenants. Upload your ID, a selfie and proof of income. It takes about 3 minutes.",
  },
  landlord: {
    title: "Verify your identity before you list a property",
    body: "Tenants only see listings from verified landlords. Upload your ID and proof of address. It takes about 3 minutes.",
  },
};

/** Shown at the top of every portal page until the signed-in tenant or landlord is verified. */
export function IdentityBanner({ role }: { role: "tenant" | "landlord" }) {
  const user = useCurrentUser();
  const pathname = useFullPathname();
  if (!user || user.role !== role || pathname === verifyPath(role)) return null;
  const status = identityStatus(user);
  if (status === "verified") return null;

  if (status === "pending")
    return (
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 text-sm">
        <Clock className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="flex-1">
          <span className="font-semibold">Your documents are being reviewed.</span>{" "}
          <span className="text-muted-foreground">We&apos;ll notify you once you&apos;re verified, usually within 24 hours.</span>
        </p>
        <Link href={verifyPath(role)} className="hidden shrink-0 font-medium text-primary hover:underline sm:inline">
          View submission
        </Link>
      </div>
    );

  const rejected = status === "rejected";
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className={
        rejected
          ? "mb-6 flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 p-5 text-white shadow-lg shadow-rose-900/10 sm:flex-row sm:items-center"
          : "mb-6 flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-5 text-white shadow-lg shadow-brand-900/10 sm:flex-row sm:items-center"
      }
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
        {rejected ? <ShieldAlert className="size-5" /> : <ShieldCheck className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{rejected ? "We couldn't verify your identity" : COPY[role].title}</p>
        <p className="text-sm text-white/85">{rejected ? `${user.identity?.rejectionReason ?? "Your documents couldn't be verified."} Please upload them again.` : COPY[role].body}</p>
      </div>
      <Button asChild variant="white" className={rejected ? "text-rose-700" : undefined}>
        <Link href={verifyPath(role)}>
          {rejected ? "Re-upload documents" : "Verify now"} <ArrowRight />
        </Link>
      </Button>
    </motion.div>
  );
}


