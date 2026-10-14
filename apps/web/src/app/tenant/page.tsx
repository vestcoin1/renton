"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, Heart, ListChecks, MessageSquare, Search, Sparkles, Eye, Bookmark, Send, BellRing } from "lucide-react";
import { useActivityFeed, useMessageThreads, useTenantData } from "renton-core/hooks";
import { topMatches } from "@/lib/matching";
import { PageHeader, StatCard } from "renton-ui/dashboard/widgets";
import { PropertyCard } from "@/components/property/property-card";
import { HomeStrip } from "@/components/tenancy/home-strip";
import { PaymentDueBanner } from "@/components/payments/payment-due-banner";
import { SafeImage } from "renton-ui/shared/safe-image";
import { EmptyState } from "renton-ui/shared/states";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "renton-ui/ui/card";
import { Progress } from "renton-ui/ui/progress";
import { APPLICATION_META } from "renton-core/status";
import { cn, formatNairaCompact, timeAgo } from "renton-core/utils";

const ACTIVITY_ICON = {
  saved: { icon: Bookmark, cls: "bg-rose-500/10 text-rose-500" },
  applied: { icon: Send, cls: "bg-primary/10 text-primary" },
  viewed: { icon: Eye, cls: "bg-muted text-muted-foreground" },
  approved: { icon: CheckCircle2, cls: "bg-success/10 text-emerald-600" },
  message: { icon: MessageSquare, cls: "bg-sky-500/10 text-sky-600" },
  waitlist: { icon: BellRing, cls: "bg-violet-500/10 text-violet-600" },
  listing: { icon: FileText, cls: "bg-muted text-muted-foreground" },
  payment: { icon: FileText, cls: "bg-muted text-muted-foreground" },
  verification: { icon: FileText, cls: "bg-muted text-muted-foreground" },
};

export default function TenantDashboard() {
  const { tenant, saved, applications, waitingLists, publicProperties, byId, lease, maintenance, invoices } = useTenantData();
  const home = lease ? byId.get(lease.propertyId) : undefined;
  const threads = useMessageThreads();
  const activity = useActivityFeed("tenant");
  const unread = threads.reduce((n, t) => n + t.unread, 0);
  const activeList = waitingLists.find((w) => w.status === "active") ?? waitingLists[0];
  const recommended = activeList
    ? topMatches(activeList, publicProperties, 3)
    : publicProperties.slice(0, 3).map((p) => ({ property: p, match: undefined }));
  const completion = 85;

  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        title={`Good day, ${tenant.name.split(" ")[0]} ðŸ‘‹`}
        description="Here's what's happening with your home search."
        actions={
          <Button asChild>
            <Link href="/properties">
              <Search /> Find homes
            </Link>
          </Button>
        }
      />

      <PaymentDueBanner invoices={invoices} byId={byId} />
      {lease && home && <HomeStrip lease={lease} property={home} maintenance={maintenance} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Saved Properties" value={saved.length} icon={Heart} tone="rose" href="/tenant/saved" />
        <StatCard
          index={1}
          label="Applications"
          value={applications.length}
          icon={FileText}
          tone="blue"
          href="/tenant/applications"
          hint={`${applications.filter((a) => a.status === "pending").length} awaiting response`}
        />
        <StatCard index={2} label="Waiting Lists" value={waitingLists.length} icon={ListChecks} tone="violet" href="/tenant/waiting-list" />
        <StatCard index={3} label="Messages" value={threads.length} icon={MessageSquare} tone="emerald" href="/tenant/messages" hint={unread ? `${unread} unread` : "All caught up"} />
      </div>

      {completion < 100 && (
        <Card className="mt-6 flex flex-col gap-4 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-semibold">Your rental profile is {completion}% complete</p>
            <p className="text-sm text-muted-foreground">Complete profiles get approved 2Ã— faster. Add your previous landlord reference to finish.</p>
            <Progress value={completion} className="mt-3 h-2 max-w-md" indicatorClassName="bg-success" />
          </div>
          <Button asChild variant="outline">
            <Link href="/tenant/profile">Complete profile</Link>
          </Button>
        </Card>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-4 text-violet-500" /> Recommended for you
                </CardTitle>
                <p className="text-sm text-muted-foreground">{activeList ? `Based on your ${activeList.city} waiting list` : "Popular verified homes"}</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/tenant/waiting-list">
                  View all <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.map(({ property, match }) => (
                <PropertyCard key={property.id} property={property} match={match} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Application status</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/tenant/applications">
                  Manage <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              {applications.length === 0 ? (
                <EmptyState className="m-5" icon={FileText} title="No applications yet" description="Apply to a verified home to see it here." action={{ label: "Browse homes", href: "/properties" }} />
              ) : (
                <ul className="divide-y">
                  {applications.slice(0, 4).map((a) => {
                    const p = byId.get(a.propertyId);
                    if (!p) return null;
                    const meta = APPLICATION_META[a.status];
                    return (
                      <li key={a.id} className="flex items-center gap-4 px-5 py-3 sm:px-6">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
                          <SafeImage src={p.images[0]} alt="" fill sizes="48px" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.area}, {p.city} Â· Applied {timeAgo(a.submittedAt)}
                          </p>
                        </div>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-border">
                {activity.map((a) => {
                  const meta = ACTIVITY_ICON[a.kind];
                  return (
                    <li key={a.id} className="relative flex gap-3">
                      <span className={cn("relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-card", meta.cls)}>
                        <meta.icon className="size-4" />
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-medium leading-snug">{a.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.detail} Â· {timeAgo(a.createdAt)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Heart className="size-4 text-rose-500" /> Saved properties
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/tenant/saved">All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {saved.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tap the heart on any listing to save it here.</p>
              ) : (
                <ul className="space-y-3">
                  {saved.slice(0, 4).map((p) => (
                    <li key={p.id}>
                      <Link href={`/properties/${p.id}`} className="group flex items-center gap-3">
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                          <SafeImage src={p.images[0]} alt="" fill sizes="56px" className="transition-transform group-hover:scale-110" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium group-hover:text-primary">{p.title}</p>
                          <p className="text-xs text-muted-foreground">{p.area}</p>
                          <p className="text-sm font-semibold">{formatNairaCompact(p.rent)}/yr</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}


