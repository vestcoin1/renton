"use client";

import { ZoneLink as Link } from "renton-ui/zone-link";
import { ArrowRight, BadgeCheck, Building2, Clock, Flag, House, ShieldCheck, UserRound, Users } from "lucide-react";
import { useStore } from "renton-core/store";
import { MiniBarChart, PageHeader, StatCard } from "renton-ui/dashboard/widgets";
import { ReviewCard } from "@/components/review-card";
import { EmptyState } from "renton-ui/shared/states";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "renton-ui/ui/card";
import { SEVERITY_META, VERIFICATION_FLOW } from "renton-core/status";
import { cn, timeAgo } from "renton-core/utils";

const OPEN_STAGES = ["submitted", "inspection_scheduled", "under_review"];
const WEEKLY = [
  { label: "Mon", value: 14 },
  { label: "Tue", value: 22 },
  { label: "Wed", value: 18 },
  { label: "Thu", value: 27 },
  { label: "Fri", value: 24 },
  { label: "Sat", value: 9 },
  { label: "Sun", value: 12 },
];

export default function AdminDashboard() {
  const users = useStore((s) => s.users);
  const properties = useStore((s) => s.properties);
  const verifications = useStore((s) => s.verifications);
  const reports = useStore((s) => s.reports);

  // Platform totals are mocked at scale; live mock entities are added on top so actions visibly move the numbers.
  const landlords = users.filter((u) => u.role === "landlord").length;
  const tenants = users.filter((u) => u.role === "tenant").length;
  const pending = properties.filter((p) => OPEN_STAGES.includes(p.verification)).length;
  const verified = properties.filter((p) => p.verification === "verified" || p.verification === "published").length;
  const byId = new Map(properties.map((p) => [p.id, p]));
  const usersById = new Map(users.map((u) => [u.id, u]));
  const queue = verifications
    .filter((v) => OPEN_STAGES.includes(byId.get(v.propertyId)?.verification ?? ""))
    .sort((a, b) => (a.priority === "high" ? -1 : 0) - (b.priority === "high" ? -1 : 0));
  const funnel = VERIFICATION_FLOW.map((s) => ({ ...s, count: properties.filter((p) => p.verification === s.stage).length }));
  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);

  return (
    <>
      <PageHeader
        eyebrow="Verification Team"
        title="Platform overview"
        description="Trust & safety at a glance."
        actions={
          <Button asChild>
            <Link href="/admin/verifications">
              <ShieldCheck /> Open queue
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard index={0} label="Total Users" value={(12_480 + users.length).toLocaleString()} icon={Users} tone="blue" delta={{ value: "4.2%", positive: true }} href="/admin/users" />
        <StatCard index={1} label="Total Landlords" value={(1_830 + landlords).toLocaleString()} icon={Building2} tone="violet" href="/admin/users" />
        <StatCard index={2} label="Total Tenants" value={(10_640 + tenants).toLocaleString()} icon={UserRound} tone="emerald" href="/admin/users" />
        <StatCard index={3} label="Total Properties" value={(2_410 + properties.length).toLocaleString()} icon={House} tone="slate" />
        <StatCard index={4} label="Pending Verification" value={pending} icon={Clock} tone="amber" href="/admin/verifications" />
        <StatCard index={5} label="Verified Properties" value={(2_380 + verified).toLocaleString()} icon={BadgeCheck} tone="emerald" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Property verification queue</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/verifications">
                View all <ArrowRight />
              </Link>
            </Button>
          </div>
          {queue.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="Queue is clear" description="Every submitted listing has been reviewed. Nice work!" />
          ) : (
            queue.slice(0, 3).map((v) => {
              const p = byId.get(v.propertyId)!;
              return <ReviewCard key={v.id} request={v} property={p} landlord={usersById.get(p.landlordId)} />;
            })
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verification funnel</CardTitle>
              <CardDescription>Current listings by stage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {funnel.map((f, i) => (
                <div key={f.stage}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-muted-foreground">{f.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full transition-all duration-700", i >= 4 ? "bg-success" : "bg-primary")} style={{ width: `${(f.count / maxFunnel) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Verifications this week</CardTitle>
              <CardDescription>126 completed Â· avg. 41 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <MiniBarChart data={WEEKLY} className="h-36" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Flag className="size-4 text-destructive" /> Latest reports
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/reports">All</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {reports.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-start gap-3">
                  <Badge variant={SEVERITY_META[r.severity].variant} className="mt-0.5 shrink-0">
                    {SEVERITY_META[r.severity].label}
                  </Badge>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.reason} Â· {timeAgo(r.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}


