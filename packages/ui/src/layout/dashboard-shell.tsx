"use client";

import { ZoneLink as Link, useFullPathname, useZoneRouter } from "../zone-link";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  Flag,
  Heart,
  House,
  LayoutDashboard,
  ListChecks,
  Menu,
  Ellipsis,
  MessageSquare,
  PlusCircle,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
  KeyRound,
  CreditCard,
  Banknote,
  BadgeCheck,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "renton-shared/types";
import { Logo } from "../shared/logo";
import { ThemeToggle } from "../shared/theme-toggle";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "../ui/sheet";
import { selectCurrentUser, useHydration, useStore } from "renton-core/store";
import { NotificationBell } from "./notification-bell";
import { ROLE_HOME, ROLE_LABEL, UserMenu } from "./user-menu";
import { IdentityBanner } from "../identity/identity-banner";
import { DashboardSkeleton } from "../dashboard/widgets";
import { cn } from "renton-core/utils";
import { OPEN_STATUSES as OPEN_MAINTENANCE } from "../maintenance/meta";
import { identityStatus } from "renton-core/identity";
import { LOGIN_PATH } from "renton-core/zones";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: (s: ReturnType<typeof useStore.getState>) => number;
}

/** 1 while the signed-in user still has to (re-)submit identity documents. */
const verifyBadge = (s: ReturnType<typeof useStore.getState>) => {
  const user = selectCurrentUser(s);
  const status = user ? identityStatus(user) : "verified";
  return status === "unverified" || status === "rejected" ? 1 : 0;
};

const NAV: Record<UserRole, { section?: string; items: NavItem[] }[]> = {
  tenant: [
    {
      items: [
        { href: "/tenant", label: "Dashboard", icon: LayoutDashboard },
        { href: "/tenant/home", label: "My Home", icon: KeyRound },
        {
          href: "/tenant/repairs",
          label: "Repairs",
          icon: Wrench,
          badge: (s) => s.maintenance.filter((m) => m.tenantId === s.userId && OPEN_MAINTENANCE.includes(m.status)).length,
        },
        { href: "/properties", label: "Browse Homes", icon: Search },
        { href: "/tenant/saved", label: "Saved", icon: Heart, badge: (s) => s.savedIds.length },
        {
          href: "/tenant/applications",
          label: "Applications",
          icon: FileText,
          badge: (s) => s.applications.filter((a) => a.tenantId === s.userId && a.status === "pending").length,
        },
        {
          href: "/tenant/payments",
          label: "Payments",
          icon: CreditCard,
          badge: (s) => s.invoices.filter((i) => i.tenantId === s.userId && (i.status === "awaiting_payment" || i.status === "rejected")).length,
        },
        { href: "/tenant/waiting-list", label: "Waiting Lists", icon: ListChecks },
        { href: "/tenant/messages", label: "Messages", icon: MessageSquare },
      ],
    },
    {
      section: "Account",
      items: [
        { href: "/tenant/profile", label: "Profile", icon: UserRound },
        { href: "/tenant/verify", label: "Verification", icon: BadgeCheck, badge: verifyBadge },
      ],
    },
  ],
  landlord: [
    {
      items: [
        { href: "/landlord", label: "Dashboard", icon: LayoutDashboard },
        { href: "/landlord/properties", label: "Properties", icon: Building2 },
        { href: "/landlord/properties/new", label: "Add Property", icon: PlusCircle },
        {
          href: "/landlord/applications",
          label: "Applications",
          icon: FileText,
          badge: (s) => {
            const mine = new Set(s.properties.filter((p) => p.landlordId === s.userId).map((p) => p.id));
            return s.applications.filter((a) => mine.has(a.propertyId) && a.status === "pending").length;
          },
        },
        {
          href: "/landlord/maintenance",
          label: "Maintenance",
          icon: Wrench,
          badge: (s) => {
            const mine = new Set(s.properties.filter((p) => p.landlordId === s.userId).map((p) => p.id));
            return s.maintenance.filter((m) => mine.has(m.propertyId) && m.status === "awaiting_approval").length;
          },
        },
        {
          href: "/landlord/tenants",
          label: "Tenants",
          icon: Users,
          badge: (s) => {
            const mine = new Set(s.properties.filter((p) => p.landlordId === s.userId).map((p) => p.id));
            return s.leases.filter((l) => mine.has(l.propertyId) && l.intent && !l.intent.landlordResponse).length;
          },
        },
        { href: "/landlord/vacancies", label: "Vacancies", icon: CalendarClock },
      ],
    },
    { section: "Account", items: [{ href: "/landlord/verify", label: "Verification", icon: BadgeCheck, badge: verifyBadge }] },
  ],
  admin: [
    {
      items: [
        { href: "/admin", label: "Overview", icon: LayoutDashboard },
        {
          href: "/admin/verifications",
          label: "Verification Queue",
          icon: ShieldCheck,
          badge: (s) => s.verifications.filter((v) => ["submitted", "inspection_scheduled", "under_review"].includes(v.stage)).length,
        },
        {
          href: "/admin/payments",
          label: "Payments",
          icon: CreditCard,
          badge: (s) => s.invoices.filter((i) => i.status === "submitted").length,
        },
        {
          href: "/admin/rent",
          label: "Rent Installments",
          icon: PiggyBank,
          badge: (s) => s.rentPlans.reduce((n, p) => n + p.contributions.filter((c) => c.status === "submitted").length, 0),
        },
        {
          href: "/admin/refunds",
          label: "Refunds",
          icon: Banknote,
          badge: (s) => s.refunds.filter((r) => (r.status === "requested" && new Date(r.eligibleFrom) <= new Date()) || r.status === "approved").length,
        },
        {
          href: "/admin/maintenance",
          label: "Maintenance",
          icon: Wrench,
          badge: (s) => s.maintenance.filter((m) => ["submitted", "investigating", "approved"].includes(m.status)).length,
        },
        { href: "/admin/users", label: "Users", icon: Users, badge: (s) => s.users.filter((u) => u.identity?.status === "pending").length },
        {
          href: "/admin/reports",
          label: "Reports",
          icon: Flag,
          badge: (s) => s.reports.filter((r) => r.status === "open").length,
        },
      ],
    },
  ],
};

function SidebarNav({ role }: { role: UserRole }) {
  const pathname = useFullPathname();
  const state = useStore();
  const hydrated = useHydration((s) => s.hydrated);

  const isActive = (href: string) => {
    if (href === ROLE_HOME[role]) return pathname === href;
    if (href === "/landlord/properties") return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label={`${ROLE_LABEL[role]} navigation`}>
      {NAV[role].map((group, gi) => (
        <div key={gi}>
          {group.section && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.section}</p>}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              const count = hydrated && item.badge ? item.badge(state) : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {active && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
                    <item.icon className="size-[18px] shrink-0" />
                    {item.label}
                    {count > 0 && (
                      <span
                        className={cn(
                          "ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold",
                          active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ role }: { role: UserRole }) {
  if (role === "landlord")
    return (
      <div className="m-3 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 p-4 text-white">
        <ClipboardList className="size-5 text-emerald-300" />
        <p className="mt-2 text-sm font-semibold">Get verified faster</p>
        <p className="mt-1 text-xs text-white/75">Upload your C of O and owner ID to skip the queue.</p>
        <Button asChild size="sm" variant="white" className="mt-3 w-full">
          <Link href="/landlord/properties/new">Add property</Link>
        </Button>
      </div>
    );
  if (role === "tenant")
    return (
      <div className="m-3 rounded-xl border bg-subtle p-4">
        <p className="text-sm font-semibold">Never pay off-platform</p>
        <p className="mt-1 text-xs text-muted-foreground">renton landlords never ask for inspection fees.</p>
      </div>
    );
  return (
    <div className="m-3 rounded-xl border bg-subtle p-4">
      <p className="text-xs text-muted-foreground">SLA target</p>
      <p className="text-sm font-semibold">Verify within 72 hours</p>
    </div>
  );
}

/** The four most-used destinations per portal; everything else lives under "More". */
const MOBILE_TABS: Record<UserRole, string[]> = {
  tenant: ["/tenant", "/tenant/home", "/tenant/repairs", "/tenant/payments"],
  landlord: ["/landlord", "/landlord/properties", "/landlord/tenants", "/landlord/maintenance"],
  admin: ["/admin", "/admin/verifications", "/admin/payments", "/admin/maintenance"],
};

const SHORT_LABEL: Record<string, string> = {
  "Verification Queue": "Queue",
  "Add Property": "Add",
};

function MobileTabBar({ role, onMore }: { role: UserRole; onMore: () => void }) {
  const pathname = useFullPathname();
  const state = useStore();
  const hydrated = useHydration((s) => s.hydrated);
  const items = NAV[role].flatMap((g) => g.items);
  const tabs = MOBILE_TABS[role].map((href) => items.find((i) => i.href === href)!).filter(Boolean);
  const isActive = (href: string) => (href === ROLE_HOME[role] ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  const moreActive = !tabs.some((t) => isActive(t.href));

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map((t) => {
          const active = isActive(t.href);
          const count = hydrated && t.badge ? t.badge(state) : 0;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] font-medium transition-colors", active ? "text-primary" : "text-muted-foreground")}
              >
                {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-primary" />}
                <span className="relative">
                  <t.icon className="size-[22px]" />
                  {count > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-background">
                      {count}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate">{SHORT_LABEL[t.label] ?? t.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMore}
            className={cn("flex w-full flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] font-medium", moreActive ? "text-primary" : "text-muted-foreground")}
          >
            <Ellipsis className="size-[22px]" />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}

export function DashboardShell({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const pathname = useFullPathname();
  const router = useZoneRouter();
  const hydrated = useHydration((s) => s.hydrated);
  const currentRole = useStore((s) => s.role);
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  // Auth guard: signed-out visitors go to login (and come back after); other roles go to their own portal.
  // Becomes Next.js middleware once sessions live in Supabase cookies.
  useEffect(() => {
    if (!hydrated || currentRole === role) return;
    router.replace(currentRole ? ROLE_HOME[currentRole] : `${LOGIN_PATH}?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, currentRole, role, router, pathname]);

  const ready = hydrated && currentRole === role;

  return (
    <div className="min-h-dvh bg-subtle">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Logo href={ROLE_HOME[role]} />
        </div>
        <div className="px-5 pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <House className="size-3.5" /> {ROLE_LABEL[role]} portal
          </span>
        </div>
        <SidebarNav role={role} />
        <SidebarFooter role={role} />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-xl sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="gap-0 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-16 items-center border-b px-5">
                <Logo href={ROLE_HOME[role]} />
              </div>
              <SidebarNav role={role} />
              <SidebarFooter role={role} />
            </SheetContent>
          </Sheet>
          <div className="lg:hidden">
            <Logo href={ROLE_HOME[role]} className="[&>span]:hidden sm:[&>span]:inline" />
          </div>
          <div className="relative hidden max-w-sm flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder={role === "admin" ? "Search properties, users, reportsâ€¦" : "Search homes by area or cityâ€¦"}
              aria-label="Search"
              className="h-9 w-full rounded-lg border border-input bg-muted/50 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background"
              onKeyDown={(e) => {
                if (e.key === "Enter") router.push(`/properties?q=${encodeURIComponent(e.currentTarget.value)}`);
              }}
            />
          </div>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/">View site</Link>
            </Button>
            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-8">
          {ready ? (
            <>
              {role !== "admin" && <IdentityBanner role={role} />}
              {children}
            </>
          ) : (
            <DashboardSkeleton />
          )}
        </main>
      </div>
      <MobileTabBar role={role} onMore={() => setOpen(true)} />
    </div>
  );
}


