"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, House, KeyRound, MapPin, MessageSquare, Phone, Wallet, Wrench } from "lucide-react";
import { useLandlordProfile, useTenantData } from "renton-core/hooks";
import { PageHeader, UserAvatar } from "renton-ui/dashboard/widgets";
import { RentCountdown } from "@/components/tenancy/rent-countdown";
import { LeaseIntentPanel } from "@/components/tenancy/lease-intent";
import { TenantRentReview, REVIEW_STATUS } from "@/components/tenancy/rent-review";
import { CautionRefundPanel } from "renton-ui/tenancy/caution-refund";
import { RentPlanSummary } from "renton-ui/payments/rent-plan";
import { NewRepairDialog } from "@/components/maintenance/new-request-dialog";
import { MAINTENANCE_STATUS, OPEN_STATUSES, categoryIcon } from "renton-ui/maintenance/meta";
import { SafeImage } from "renton-ui/shared/safe-image";
import { EmptyState } from "renton-ui/shared/states";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "renton-ui/ui/card";
import { Progress } from "renton-ui/ui/progress";
import { formatDate, formatNaira, timeAgo } from "renton-core/utils";

export default function MyHomePage() {
  const { lease, byId, maintenance, refunds } = useTenantData();
  const landlord = useLandlordProfile(lease ? byId.get(lease.propertyId)?.landlordId : undefined);

  if (!lease) {
    return (
      <>
        <PageHeader title="My Home" />
        <EmptyState icon={House} title="You haven't moved in yet" description="Once your application is approved and your lease starts, your rent countdown, lease and repairs appear here." action={{ label: "Browse verified homes", href: "/properties" }} />
      </>
    );
  }

  const p = byId.get(lease.propertyId)!;
  const start = +new Date(lease.leaseStart);
  const end = +new Date(lease.leaseEnd);
  const elapsedPct = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
  const monthsIn = Math.max(0, Math.round((Date.now() - start) / (30.4 * 86400000)));
  const openRepairs = maintenance.filter((m) => OPEN_STATUSES.includes(m.status));
  const daysLeft = Math.floor((end - Date.now()) / 86400000);

  return (
    <>
      <PageHeader
        eyebrow="My Home"
        title={`${lease.unit}, ${p.area}`}
        description={`${p.title} Â· ${p.city}`}
        actions={
          <NewRepairDialog lease={lease}>
            <Button>
              <Wrench /> Request a repair
            </Button>
          </NewRepairDialog>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-br from-brand-50 to-transparent dark:from-brand-900/30">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" /> Rent countdown
              </CardTitle>
              <CardDescription>Annual rent is due when your current term ends.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 sm:pt-6">
              <RentCountdown lease={lease} />
              <RentPlanSummary lease={lease} className="mt-6" />
            </CardContent>
          </Card>

          {lease.rentReview && (
            <Card className={lease.rentReview.status === "proposed" ? "border-amber-500/40 ring-2 ring-amber-500/10" : undefined}>
              <CardHeader className="flex-col items-start justify-between gap-2 sm:flex-row sm:gap-3">
                <div>
                  <CardTitle>Rent review</CardTitle>
                  <CardDescription>Your landlord has proposed a new rent for your next term.</CardDescription>
                </div>
                <Badge variant={REVIEW_STATUS[lease.rentReview.status].variant}>{REVIEW_STATUS[lease.rentReview.status].tenant}</Badge>
              </CardHeader>
              <CardContent>
                <TenantRentReview lease={lease} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>What happens at the end of your lease?</CardTitle>
              <CardDescription>
                {daysLeft > 0
                  ? `Tell your landlord at least 30 days before ${formatDate(lease.leaseEnd)}. You have ${daysLeft} days left.`
                  : "Your lease has ended. Let your landlord know your plans."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaseIntentPanel lease={lease} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Caution deposit refund</CardTitle>
              <CardDescription>Get your deposit back when you move out.</CardDescription>
            </CardHeader>
            <CardContent>
              <CautionRefundPanel lease={lease} refund={refunds.find((r) => r.leaseId === lease.id)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="size-4 text-orange-500" /> Repairs
                </CardTitle>
                <CardDescription>{openRepairs.length ? `${openRepairs.length} in progress` : "Everything's working ðŸ‘"}</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/tenant/repairs">
                  All repairs <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {maintenance.length === 0 && <p className="text-sm text-muted-foreground">No repair requests yet.</p>}
              {maintenance.slice(0, 4).map((m) => {
                const Icon = categoryIcon(m.category);
                return (
                  <Link key={m.id} href="/tenant/repairs" className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-primary/40">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">Updated {timeAgo(m.updatedAt)}</p>
                    </div>
                    <Badge variant={MAINTENANCE_STATUS[m.status].variant}>{MAINTENANCE_STATUS[m.status].tenantLabel}</Badge>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="relative aspect-[16/9]">
              <SafeImage src={p.images[0]} alt={p.title} fill sizes="(max-width: 1280px) 100vw, 40vw" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                <KeyRound className="size-3.5 text-primary" /> Your home
              </span>
            </div>
            <CardContent className="space-y-4 pt-5 sm:pt-5">
              <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" /> {p.address}, {p.area}, {p.city}
              </p>
              <div>
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>Moved in {formatDate(lease.leaseStart)}</span>
                  <span>Ends {formatDate(lease.leaseEnd)}</span>
                </div>
                <Progress value={elapsedPct} className="h-2" />
                <p className="mt-1.5 text-xs text-muted-foreground">{monthsIn} months into your lease</p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-muted/60 p-3">
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Wallet className="size-3.5" /> Annual rent
                  </dt>
                  <dd className="font-semibold">{formatNaira(lease.annualRent)}</dd>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" /> Last paid
                  </dt>
                  <dd className="font-semibold">{formatDate(lease.lastPaymentAt)}</dd>
                </div>
              </dl>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/properties/${p.id}`}>View listing</Link>
              </Button>
            </CardContent>
          </Card>

          {landlord && (
            <Card>
              <CardHeader>
                <CardTitle>Your landlord</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <UserAvatar name={landlord.name} hue={landlord.avatarHue} className="size-12" />
                  <div>
                    <p className="flex items-center gap-1 font-semibold">
                      {landlord.name} <BadgeCheck className="size-4 text-success" />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Responds {landlord.responseTime} Â· {landlord.residence}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline">
                    <Link href="/tenant/messages">
                      <MessageSquare /> Message
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <a href="tel:+2347004663347">
                      <Phone /> Support
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Repairs go through renton, so you don&apos;t need to chase your landlord or find an artisan yourself.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}


