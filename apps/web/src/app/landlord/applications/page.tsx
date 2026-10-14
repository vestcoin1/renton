"use client";

import { useState } from "react";
import { BadgeCheck, Briefcase, Check, FileText, Inbox, Users, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import type { ApplicationStatus, TenantProfile } from "@/types";
import { useLandlordData } from "renton-core/hooks";
import { useStore } from "renton-core/store";
import { PageHeader, UserAvatar } from "renton-ui/dashboard/widgets";
import { EmptyState } from "renton-ui/shared/states";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card } from "renton-ui/ui/card";
import { Tabs, TabsList, TabsTrigger } from "renton-ui/ui/tabs";
import { APPLICATION_META } from "renton-core/status";
import { PAYMENT_STATUS } from "renton-ui/payments/payment-parts";
import { formatDate, formatNairaCompact, timeAgo } from "renton-core/utils";

export default function LandlordApplicationsPage() {
  const { applications, byId, usersById, invoices } = useLandlordData();
  const setStatus = useStore((s) => s.setApplicationStatus);
  const [tab, setTab] = useState<ApplicationStatus | "all">("pending");
  const list = applications.filter((a) => tab === "all" || a.status === tab).sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));

  return (
    <>
      <PageHeader title="Applications" description="Every applicant is ID-verified. Review their rental profile and respond directly." />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-5">
        <TabsList>
          {(["pending", "approved", "rejected", "all"] as const).map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t} <span className="text-[11px] text-muted-foreground">{t === "all" ? applications.length : applications.filter((a) => a.status === t).length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {list.length === 0 ? (
        <EmptyState icon={Inbox} title="No applications here" description="New applications will appear here as tenants apply to your verified listings." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((a) => {
            const t = usersById.get(a.tenantId) as TenantProfile | undefined;
            const p = byId.get(a.propertyId);
            const meta = APPLICATION_META[a.status];
            if (!t || !p) return null;
            const affordability = Math.round(((t.monthlyIncome * 12) / p.rent) * 10) / 10;
            return (
              <Card key={a.id} className="p-5">
                <div className="flex items-start gap-3">
                  <UserAvatar name={t.name} hue={t.avatarHue} className="size-11" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{t.name}</p>
                      {t.identityVerified && <BadgeCheck className="size-4 shrink-0 text-success" aria-label="ID verified" />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      For <span className="font-medium text-foreground">{p.title}</span> Â· {timeAgo(a.submittedAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    {(() => {
                      const inv = invoices.find((i) => i.id === a.invoiceId);
                      if (!inv) return null;
                      const label = { awaiting_payment: "Awaiting tenant payment", submitted: "Payment being verified", verified: "Paid Â· tenancy started", rejected: "Payment needs re-upload" }[inv.status];
                      return <Badge variant={PAYMENT_STATUS[inv.status].variant}>{label}</Badge>;
                    })()}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/60 p-2">
                    <Briefcase className="mx-auto size-4 text-muted-foreground" />
                    <p className="mt-1 truncate text-xs font-medium">{t.occupation}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2">
                    <Wallet className="mx-auto size-4 text-muted-foreground" />
                    <p className="mt-1 text-xs font-medium">
                      {affordability}Ã— rent <span className="text-muted-foreground">income</span>
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2">
                    <Users className="mx-auto size-4 text-muted-foreground" />
                    <p className="mt-1 text-xs font-medium">Household of {t.householdSize}</p>
                  </div>
                </div>
                <p className="mt-4 rounded-lg border bg-subtle p-3 text-sm text-muted-foreground">&ldquo;{a.message}&rdquo;</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.documents.map((d) => (
                    <span key={d} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]">
                      <FileText className="size-3" /> {d}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
                  <span>
                    Move-in {formatDate(a.moveInDate)} Â· {a.leaseYears}-yr lease Â· {formatNairaCompact(p.rent * a.leaseYears)} total
                  </span>
                  {a.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setStatus(a.id, "rejected", "Thank you for applying. We've chosen another applicant for this unit.");
                          toast("Application declined", { description: `${t.name} has been notified.` });
                        }}
                      >
                        <X /> Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => {
                          setStatus(a.id, "approved", "Welcome! Let's schedule a time for the key handover.");
                          toast.success("Application approved", { description: `${t.name} has been asked to pay move-in fees to renton. We'll let you know once payment is verified.` });
                        }}
                      >
                        <Check /> Approve
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}


