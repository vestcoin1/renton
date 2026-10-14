"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Ban, Building2, Briefcase, CalendarDays, CircleCheck, Globe, Mail, MapPin, Phone, Search, ShieldQuestion, Star, UserRound } from "lucide-react";
import { toast } from "sonner";
import type { LandlordProfile, TenantProfile, User } from "renton-shared/types";
import { useStore } from "renton-core/store";
import { PageHeader, UserAvatar } from "renton-ui/dashboard/widgets";
import { EmptyState } from "renton-ui/shared/states";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card } from "renton-ui/ui/card";
import { Input } from "renton-ui/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "renton-ui/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "renton-ui/ui/table";
import { Tabs, TabsList, TabsTrigger } from "renton-ui/ui/tabs";
import { formatDate, formatNaira } from "renton-core/utils";
import { IDENTITY_STATUS_META, identityStatus } from "renton-core/identity";
import { IdentityReview } from "@/components/identity-review";

const STATUS = {
  active: { label: "Active", variant: "success" as const },
  pending: { label: "Pending KYC", variant: "warning" as const },
  suspended: { label: "Suspended", variant: "destructive" as const },
};

function UserDrawer({ user, onClose }: { user: User | null; onClose: () => void }) {
  const setStatus = useStore((s) => s.setUserStatus);
  const properties = useStore((s) => s.properties);
  const applications = useStore((s) => s.applications);
  if (!user) return null;
  const isLandlord = user.role === "landlord";
  const l = user as LandlordProfile;
  const t = user as TenantProfile;
  const owned = properties.filter((p) => p.landlordId === user.id);
  const apps = applications.filter((a) => a.tenantId === user.id);

  return (
    <Sheet open={!!user} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="gap-0 overflow-y-auto p-0">
        <SheetHeader className="items-center pt-8 text-center">
          <UserAvatar name={user.name} hue={user.avatarHue} className="size-20 text-2xl" />
          <SheetTitle className="mt-2 flex items-center gap-1.5">
            {user.name} {user.identityVerified && <BadgeCheck className="size-4 text-success" />}
          </SheetTitle>
          <SheetDescription className="capitalize">{user.role}</SheetDescription>
          <Badge variant={STATUS[user.status].variant}>{STATUS[user.status].label}</Badge>
        </SheetHeader>
        <div className="space-y-6 p-6">
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 text-muted-foreground" /> {user.email}
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 text-muted-foreground" /> {user.phone}
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin className="size-4 text-muted-foreground" /> {user.city}
            </li>
            <li className="flex items-center gap-2.5">
              <CalendarDays className="size-4 text-muted-foreground" /> Joined {formatDate(user.joinedAt)}
            </li>
          </ul>
          {isLandlord ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { k: owned.length, v: "Listings" },
                { k: `${l.responseRate}%`, v: "Response" },
                { k: l.rating, v: "Rating", icon: Star },
              ].map((s) => (
                <div key={s.v} className="rounded-xl bg-muted/60 p-3">
                  <p className="font-semibold">{s.k}</p>
                  <p className="text-[11px] text-muted-foreground">{s.v}</p>
                </div>
              ))}
              {l.isDiaspora && (
                <p className="col-span-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <Globe className="size-4" /> Diaspora Â· {l.residence}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border p-4 text-sm">
              <p className="flex items-center gap-2">
                <Briefcase className="size-4 text-muted-foreground" /> {t.occupation} Â· {t.employer}
              </p>
              <p className="text-muted-foreground">
                {t.employmentType} Â· {formatNaira(t.monthlyIncome)}/month
              </p>
              <p className="text-muted-foreground">{apps.length} applications on platform</p>
            </div>
          )}
          <IdentityReview user={user} />
          <div className="grid gap-2 border-t pt-5">
            {user.status !== "active" && (
              <Button
                variant="success"
                onClick={() => {
                  setStatus(user.id, "active");
                  toast.success(`${user.name} is now active`);
                  onClose();
                }}
              >
                <CircleCheck /> {user.status === "pending" ? "Approve KYC" : "Reinstate account"}
              </Button>
            )}
            {user.status !== "suspended" && (
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  setStatus(user.id, "suspended");
                  toast(`${user.name} has been suspended`);
                  onClose();
                }}
              >
                <Ban /> Suspend account
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function UsersPage() {
  return (
    <Suspense>
      <UsersView />
    </Suspense>
  );
}

function UsersView() {
  const params = useSearchParams();
  const users = useStore((s) => s.users);
  const properties = useStore((s) => s.properties);
  // Notification links open straight to a submission: /admin/users?review=<userId>
  const reviewId = params.get("review");
  const [tab, setTab] = useState<"tenant" | "landlord" | "review">(reviewId ? "review" : "tenant");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(reviewId);
  const awaitingReview = users.filter((u) => identityStatus(u) === "pending");
  const selected = users.find((u) => u.id === selectedId) ?? null;

  const list = useMemo(
    () => users.filter((u) => (tab === "review" ? identityStatus(u) === "pending" : u.role === tab) && (!q || [u.name, u.email, u.city].some((x) => x.toLowerCase().includes(q.toLowerCase())))),
    [users, tab, q]
  );

  return (
    <>
      <PageHeader title="User management" description="Manage tenants and landlords, KYC status and account standing." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="tenant">
              <UserRound className="size-4" /> Tenants <span className="text-[11px] text-muted-foreground">{users.filter((u) => u.role === "tenant").length}</span>
            </TabsTrigger>
            <TabsTrigger value="landlord">
              <Building2 className="size-4" /> Landlords <span className="text-[11px] text-muted-foreground">{users.filter((u) => u.role === "landlord").length}</span>
            </TabsTrigger>
            <TabsTrigger value="review">
              <ShieldQuestion className="size-4" /> ID review {awaitingReview.length > 0 && <Badge variant="warning" className="px-1.5 py-0 text-[10px]">{awaitingReview.length}</Badge>}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, city" className="pl-9" aria-label="Search users" />
        </div>
      </div>
      {list.length === 0 ? (
        tab === "review" && !q ? (
          <EmptyState icon={BadgeCheck} title="No identity documents to review" description="New tenant and landlord submissions appear here." />
        ) : (
          <EmptyState icon={Search} title="No users found" description="Try a different search term." />
        )
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead className="hidden sm:table-cell">City</TableHead>
                <TableHead className="hidden lg:table-cell">{tab === "review" ? "Role" : tab === "landlord" ? "Listings" : "Occupation"}</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead className="hidden sm:table-cell">Identity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((u) => (
                <TableRow key={u.id} tabIndex={0} className="cursor-pointer" onClick={() => setSelectedId(u.id)} onKeyDown={(e) => e.key === "Enter" && setSelectedId(u.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={u.name} hue={u.avatarHue} className="size-9" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 font-medium">
                          {u.name} {u.identityVerified && <BadgeCheck className="size-3.5 text-success" />}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{u.city}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {tab === "review" ? <span className="capitalize">{u.role}</span> : u.role === "landlord" ? properties.filter((p) => p.landlordId === u.id).length : (u as TenantProfile).occupation || "â€”"}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap md:table-cell">{formatDate(u.joinedAt)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={IDENTITY_STATUS_META[identityStatus(u)].variant}>{IDENTITY_STATUS_META[identityStatus(u)].label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS[u.status].variant}>{STATUS[u.status].label}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <UserDrawer user={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}


