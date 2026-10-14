"use client";

import { useState } from "react";
import { BadgeCheck, Bell, Briefcase, CalendarDays, Check, DoorOpen, Mail, MessageSquare, Phone, RefreshCw, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { Lease, TenantProfile } from "@/types";
import { useLandlordData } from "renton-core/hooks";
import { useStore } from "renton-core/store";
import { RentIncreaseDialog } from "@/components/landlord/rent-increase-dialog";
import { LandlordRentReviewPanel } from "@/components/landlord/rent-review-panel";
import { REVIEW_STATUS } from "@/components/tenancy/rent-review";
import { LandlordRentPlanStatus } from "renton-ui/payments/rent-plan";
import { currentRentPlan, rentPlanProgress } from "renton-core/tenancy-rules";
import { TrendingUp } from "lucide-react";
import { PageHeader, StatCard, UserAvatar } from "renton-ui/dashboard/widgets";
import { EmptyState } from "renton-ui/shared/states";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card } from "renton-ui/ui/card";
import { Progress } from "renton-ui/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "renton-ui/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "renton-ui/ui/table";
import { LEASE_META } from "renton-core/status";
import { formatDate, formatNaira } from "renton-core/utils";

function leaseProgress(l: Lease) {
  const start = +new Date(l.leaseStart);
  const end = +new Date(l.leaseEnd);
  return Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
}

function daysLeft(l: Lease) {
  return Math.round((+new Date(l.leaseEnd) - Date.now()) / 86400000);
}

export default function TenantsPage() {
  const { leases, byId, usersById, rentPlans } = useLandlordData();
  const respond = useStore((s) => s.respondToLeaseIntent);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = leases.find((l) => l.id === selectedId) ?? null;
  const setSelected = (l: Lease | null) => setSelectedId(l?.id ?? null);
  const pendingIntents = leases.filter((l) => l.intent && !l.intent.landlordResponse);
  const current = leases.filter((l) => l.status !== "ended");
  const tenant = selected ? (usersById.get(selected.tenantId) as TenantProfile | undefined) : undefined;
  const property = selected ? byId.get(selected.propertyId) : undefined;

  return (
    <>
      <PageHeader
        title="Tenants"
        description="Leases, renewals, rent reviews and tenant profiles across your properties."
        actions={
          <RentIncreaseDialog>
            <Button>
              <TrendingUp /> Increase rent
            </Button>
          </RentIncreaseDialog>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Current tenants" value={current.length} icon={Users} tone="blue" />
        <StatCard index={1} label="Expiring in 60 days" value={leases.filter((l) => l.status === "expiring").length} icon={CalendarDays} tone="amber" />
        <StatCard index={2} label="Overdue renewals" value={leases.filter((l) => l.status === "overdue").length} icon={Bell} tone="rose" />
        <StatCard index={3} label="Annual rent roll" value={`â‚¦${(current.reduce((n, l) => n + l.annualRent, 0) / 1e6).toFixed(1)}M`} icon={Wallet} tone="emerald" />
      </div>

      {pendingIntents.length > 0 && (
        <Card className="mb-6 border-amber-500/30 bg-amber-500/5 p-4">
          <p className="mb-3 text-sm font-semibold">Tenants waiting on your response</p>
          <ul className="space-y-2">
            {pendingIntents.map((l) => {
              const t = usersById.get(l.tenantId);
              const renew = l.intent!.decision === "renew";
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
                  <span className={renew ? "flex size-9 items-center justify-center rounded-lg bg-success/10 text-emerald-600" : "flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600"}>
                    {renew ? <RefreshCw className="size-4" /> : <DoorOpen className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {t?.name} {renew ? `wants to renew for ${l.intent!.renewYears} year${l.intent!.renewYears === 1 ? "" : "s"}` : `is moving out on ${formatDate(l.intent!.moveOutDate!)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {l.unit} Â· {byId.get(l.propertyId)?.area}
                      {l.intent!.reason && ` Â· ${l.intent!.reason}`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelected(l)}>
                    Review
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {leases.length === 0 ? (
        <EmptyState icon={Users} title="No tenants yet" description="Once you approve an applicant and sign a lease, they'll appear here." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="hidden md:table-cell">Lease Start</TableHead>
                <TableHead className="hidden md:table-cell">Lease End</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leases.map((l) => {
                const t = usersById.get(l.tenantId);
                const p = byId.get(l.propertyId);
                const meta = LEASE_META[l.status];
                return (
                  <TableRow
                    key={l.id}
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => setSelected(l)}
                    onKeyDown={(e) => e.key === "Enter" && setSelected(l)}
                    aria-label={`Open profile for ${t?.name}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={t?.name ?? "?"} hue={t?.avatarHue} className="size-9" />
                        <div className="min-w-0">
                          <p className="font-medium">{t?.name}</p>
                          <p className="text-xs text-muted-foreground md:hidden">Ends {formatDate(l.leaseEnd)}</p>
                          <Badge variant={meta.variant} className="mt-1 md:hidden">
                            {meta.label}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{l.unit}</p>
                      <p className="max-w-[220px] truncate text-xs text-muted-foreground">{p?.title}</p>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap md:table-cell">{formatDate(l.leaseStart)}</TableCell>
                    <TableCell className="hidden whitespace-nowrap md:table-cell">{formatDate(l.leaseEnd)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        {l.intent && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            {l.intent.decision === "renew" ? <RefreshCw className="size-3 text-success" /> : <DoorOpen className="size-3 text-amber-500" />}
                            {l.intent.decision === "renew" ? "Renewing" : "Moving out"}
                            {!l.intent.landlordResponse && " Â· respond"}
                          </span>
                        )}
                        {l.rentReview && l.rentReview.status !== "withdrawn" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            <TrendingUp className="size-3 text-primary" /> Rent: {REVIEW_STATUS[l.rentReview.status].landlord}
                          </span>
                        )}
                        {(() => {
                          const plan = currentRentPlan(rentPlans, l);
                          if (!plan) return null;
                          const pr = rentPlanProgress(plan, l);
                          return (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                              <Wallet className="size-3 text-success" /> {plan.status === "paid_out" ? "Next rent paid to you" : pr.funded ? "Next rent paid Â· payout pending" : `Next rent ${Math.floor(pr.pct)}% paid`}
                            </span>
                          );
                        })()}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="gap-0 overflow-y-auto p-0">
          {selected && tenant && property && (
            <>
              <SheetHeader className="items-center pt-8 text-center">
                <UserAvatar name={tenant.name} hue={tenant.avatarHue} className="size-20 text-2xl" />
                <SheetTitle className="mt-2 flex items-center gap-1.5">
                  {tenant.name} {tenant.identityVerified && <BadgeCheck className="size-4 text-success" />}
                </SheetTitle>
                <SheetDescription>
                  {tenant.occupation} Â· {tenant.employer}
                </SheetDescription>
                <Badge variant={LEASE_META[selected.status].variant} className="mt-1">
                  {LEASE_META[selected.status].label}
                </Badge>
              </SheetHeader>
              <div className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => toast.success(`Message sent to ${tenant.name}`)}>
                    <MessageSquare /> Message
                  </Button>
                  <Button disabled={!!selected.intent} onClick={() => toast.success("Renewal offer sent", { description: `${tenant.name} has 14 days to accept.` })}>
                    <RefreshCw /> Offer renewal
                  </Button>
                </div>
                {selected.intent && (
                  <section className={selected.intent.decision === "renew" ? "rounded-xl border border-success/30 bg-success/5 p-4" : "rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"}>
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      {selected.intent.decision === "renew" ? <RefreshCw className="size-4 text-success" /> : <DoorOpen className="size-4 text-amber-500" />}
                      {selected.intent.decision === "renew"
                        ? `Wants to renew for ${selected.intent.renewYears} year${selected.intent.renewYears === 1 ? "" : "s"}`
                        : `Moving out on ${formatDate(selected.intent.moveOutDate!)}`}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sent {formatDate(selected.intent.submittedAt)}
                      {selected.intent.reason && ` Â· ${selected.intent.reason}`}
                    </p>
                    {selected.intent.note && <p className="mt-2 text-sm">â€œ{selected.intent.note}â€</p>}
                    {selected.intent.landlordResponse ? (
                      <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        <Check className="size-4" /> {selected.intent.landlordResponse.status === "accepted" ? "Renewal accepted" : "Move-out acknowledged"}
                      </p>
                    ) : (
                      <Button
                        className="mt-3 w-full"
                        variant={selected.intent.decision === "renew" ? "success" : "default"}
                        onClick={() => {
                          const renew = selected.intent!.decision === "renew";
                          respond(selected.id);
                          toast.success(renew ? "Renewal accepted" : "Move-out acknowledged", {
                            description: renew ? "The lease end date has been extended." : "The property is now listed as available soon for waiting-list tenants.",
                          });
                        }}
                      >
                        <Check /> {selected.intent.decision === "renew" ? "Accept renewal" : "Acknowledge & list as available soon"}
                      </Button>
                    )}
                  </section>
                )}
                <section className="rounded-xl border p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <TrendingUp className="size-4 text-primary" /> Rent review
                  </h3>
                  <LandlordRentReviewPanel lease={selected} />
                </section>
                <section>
                  <h3 className="mb-3 text-sm font-semibold">Lease</h3>
                  <div className="rounded-xl border p-4">
                    <p className="font-medium">{property.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {selected.unit} Â· {property.area}, {property.city}
                    </p>
                    <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                      <span>{formatDate(selected.leaseStart)}</span>
                      <span>{formatDate(selected.leaseEnd)}</span>
                    </div>
                    <Progress
                      value={leaseProgress(selected)}
                      className="mt-1.5"
                      indicatorClassName={selected.status === "overdue" ? "bg-destructive" : selected.status === "expiring" ? "bg-amber-500" : "bg-primary"}
                    />
                    <p className="mt-2 text-xs font-medium">
                      {daysLeft(selected) >= 0 ? `${daysLeft(selected)} days remaining` : `Expired ${Math.abs(daysLeft(selected))} days ago`}
                    </p>
                  </div>
                </section>
                <section>
                  <h3 className="mb-3 text-sm font-semibold">Payments</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Annual rent</dt>
                      <dd className="font-medium">{formatNaira(selected.annualRent)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Last payment</dt>
                      <dd className="font-medium">{formatDate(selected.lastPaymentAt)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Next due</dt>
                      <dd className="font-medium">{formatDate(selected.leaseEnd)}</dd>
                    </div>
                  </dl>
                  <LandlordRentPlanStatus lease={selected} plans={rentPlans} />
                </section>
                <section>
                  <h3 className="mb-3 text-sm font-semibold">Contact &amp; profile</h3>
                  <ul className="space-y-2.5 text-sm">
                    <li className="flex items-center gap-2.5">
                      <Mail className="size-4 text-muted-foreground" /> {tenant.email}
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Phone className="size-4 text-muted-foreground" /> {tenant.phone}
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Briefcase className="size-4 text-muted-foreground" /> {tenant.employmentType} Â· {tenant.employer}
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Users className="size-4 text-muted-foreground" /> {tenant.maritalStatus} Â· household of {tenant.householdSize}
                    </li>
                  </ul>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}


