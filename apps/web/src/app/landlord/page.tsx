"use client";

import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, DoorOpen, FileText, PlusCircle, Users, Wallet, CheckCircle2, Send, ShieldCheck, Wrench, RefreshCw, TrendingUp } from "lucide-react";
import { useActivityFeed, useLandlordData } from "renton-core/hooks";
import { MiniBarChart, PageHeader, StatCard, UserAvatar } from "renton-ui/dashboard/widgets";
import { VerificationFlow } from "renton-ui/shared/verification-flow";
import { VerificationBadge } from "renton-ui/property/verification-badge";
import { SafeImage } from "renton-ui/shared/safe-image";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "renton-ui/ui/card";
import { APPLICATION_META } from "renton-core/status";
import { cn, formatNaira, formatNairaCompact, timeAgo } from "renton-core/utils";

const QUICK = [
  { href: "/landlord/properties/new", label: "Add Property", desc: "List & submit for verification", icon: PlusCircle, cls: "from-brand-600 to-brand-700 text-white" },
  { href: "/landlord/tenants", label: "Manage Tenants", desc: "Leases, renewals & payments", icon: Users, cls: "bg-card" },
  { href: "/landlord/applications", label: "View Applications", desc: "Review pre-screened applicants", icon: FileText, cls: "bg-card" },
];

const REVENUE = [
  { label: "May", value: 4_200_000 },
  { label: "Jun", value: 9_000_000 },
  { label: "Jul", value: 0 },
  { label: "Aug", value: 14_000_000 },
  { label: "Sep", value: 4_200_000 },
  { label: "Oct", value: 8_500_000 },
];

export default function LandlordDashboard() {
  const { landlord, properties, applications, leases, byId, usersById, maintenance } = useLandlordData();
  const activity = useActivityFeed("landlord");
  const approvals = maintenance.filter((m) => m.status === "awaiting_approval");
  const decisions = leases.filter((l) => l.intent && !l.intent.landlordResponse);
  const counters = leases.filter((l) => l.rentReview?.status === "countered");
  const activeTenants = leases.filter((l) => l.status !== "ended").length;
  const vacant = properties.filter((p) => p.occupancy === "vacant").length;
  const inPipeline = properties.filter((p) => !["published", "verified"].includes(p.verification));
  const live = properties.length - inPipeline.length;
  const occupancy = {
    occupied: properties.filter((p) => p.occupancy === "occupied").length,
    soon: properties.filter((p) => p.occupancy === "available_soon").length,
    vacant,
  };
  const pending = applications.filter((a) => a.status === "pending");

  return (
    <>
      <PageHeader
        eyebrow="Landlord portal"
        title={`Welcome back, ${landlord.name.split(" ")[0]}`}
        description={[landlord.company, `Managing from ${landlord.residence}`].filter(Boolean).join(" Â· ")}
        actions={
          <Button asChild>
            <Link href="/landlord/properties/new">
              <PlusCircle /> Add property
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Total Properties" value={properties.length} icon={Building2} tone="blue" href="/landlord/properties" hint={`${live} live Â· ${inPipeline.length} in verification`} />
        <StatCard index={1} label="Active Tenants" value={activeTenants} icon={Users} tone="emerald" href="/landlord/tenants" delta={{ value: "+1", positive: true }} />
        <StatCard index={2} label="Vacant Properties" value={vacant} icon={DoorOpen} tone="amber" href="/landlord/vacancies" />
        <StatCard index={3} label="Applications Received" value={applications.length} icon={FileText} tone="violet" href="/landlord/applications" hint={`${pending.length} need review`} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {QUICK.map((q, i) => (
          <Link
            key={q.href}
            href={q.href}
            className={cn(
              "group flex items-center gap-4 rounded-2xl border p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
              i === 0 ? `bg-gradient-to-br ${q.cls} border-transparent` : q.cls
            )}
          >
            <span className={cn("flex size-11 items-center justify-center rounded-xl", i === 0 ? "bg-white/15" : "bg-primary/10 text-primary")}>
              <q.icon className="size-5" />
            </span>
            <div className="flex-1">
              <p className="font-semibold">{q.label}</p>
              <p className={cn("text-xs", i === 0 ? "text-white/75" : "text-muted-foreground")}>{q.desc}</p>
            </div>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>

      {(approvals.length > 0 || decisions.length > 0 || counters.length > 0) && (
        <Card className="mt-6 border-amber-500/30 bg-amber-500/[0.04]">
          <CardHeader>
            <CardTitle>Action needed</CardTitle>
            <CardDescription>Your tenants are waiting on these.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {approvals.map((m) => (
              <Link key={m.id} href="/landlord/maintenance" className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                  <Wrench className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">Approve repair: {m.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {byId.get(m.propertyId)?.area} Â· est. {formatNaira(m.investigation?.estimatedCost ?? 0)}
                  </p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
            {counters.map((l) => {
              const offer = l.rentReview!.offers[l.rentReview!.offers.length - 1].amount;
              return (
                <Link key={`rr-${l.id}`} href="/landlord/tenants" className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <TrendingUp className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{usersById.get(l.tenantId)?.name} countered your rent increase</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Offered {formatNaira(offer)}/yr Â· {l.unit}, {byId.get(l.propertyId)?.area}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
            {decisions.map((l) => {
              const renew = l.intent!.decision === "renew";
              return (
                <Link key={l.id} href="/landlord/tenants" className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", renew ? "bg-success/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                    {renew ? <RefreshCw className="size-5" /> : <DoorOpen className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {usersById.get(l.tenantId)?.name} {renew ? "wants to renew" : "is moving out"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.unit} Â· {byId.get(l.propertyId)?.area}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="size-4 text-primary" /> Rent collected
              </CardTitle>
              <CardDescription>Last 6 months across your portfolio</CardDescription>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold">{formatNaira(REVENUE.reduce((n, r) => n + r.value, 0))}</p>
              <Badge variant="success">+18% YoY</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <MiniBarChart data={REVENUE} format={formatNairaCompact} className="h-48" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Occupancy</CardTitle>
            <CardDescription>{properties.length} properties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              <div className="bg-primary" style={{ width: `${(occupancy.occupied / properties.length) * 100}%` }} />
              <div className="bg-amber-500" style={{ width: `${(occupancy.soon / properties.length) * 100}%` }} />
              <div className="bg-success" style={{ width: `${(occupancy.vacant / properties.length) * 100}%` }} />
            </div>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                { l: "Occupied", n: occupancy.occupied, c: "bg-primary" },
                { l: "Available soon", n: occupancy.soon, c: "bg-amber-500" },
                { l: "Vacant", n: occupancy.vacant, c: "bg-success" },
              ].map((x) => (
                <li key={x.l} className="flex items-center gap-2.5">
                  <span className={cn("size-2.5 rounded-full", x.c)} />
                  <span className="flex-1">{x.l}</span>
                  <span className="font-semibold">{x.n}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link href="/landlord/vacancies">
                <CalendarClock /> Manage vacancies
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-success" /> Verification pipeline
              </CardTitle>
              <CardDescription>Listings moving from draft to published</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/landlord/properties">
                All <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {inPipeline.length === 0 && <p className="text-sm text-muted-foreground">All your listings are verified and live. ðŸŽ‰</p>}
            {inPipeline.map((p) => (
              <div key={p.id} className="rounded-xl border p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
                    <SafeImage src={p.images[0]} alt="" fill sizes="48px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.area}, {p.city}
                    </p>
                  </div>
                  <VerificationBadge stage={p.verification} />
                </div>
                <VerificationFlow stage={p.verification} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>New applications</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/landlord/applications">Review</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {applications.slice(0, 4).map((a) => {
                const t = usersById.get(a.tenantId);
                const p = byId.get(a.propertyId);
                const meta = APPLICATION_META[a.status];
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <UserAvatar name={t?.name ?? "?"} hue={t?.avatarHue} className="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p?.area} Â· {timeAgo(a.submittedAt)}
                      </p>
                    </div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activity.map((a) => {
                const Icon = a.kind === "payment" ? Wallet : a.kind === "applied" ? Send : a.kind === "verification" ? CheckCircle2 : Building2;
                return (
                  <div key={a.id} className="flex gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="size-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{a.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.detail} Â· {timeAgo(a.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}


