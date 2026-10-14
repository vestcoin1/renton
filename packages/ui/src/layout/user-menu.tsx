"use client";

import { ZoneLink as Link, useZoneRouter } from "../zone-link";
import { SIGNED_OUT_PATH } from "renton-core/zones";
import { Building2, LayoutDashboard, LogOut, RotateCcw, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "renton-shared/types";
import { selectCurrentUser, useStore } from "renton-core/store";
import { useDemoAccount } from "renton-core/hooks";
import { UserAvatar } from "../dashboard/widgets";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export const ROLE_HOME: Record<UserRole, string> = { tenant: "/tenant", landlord: "/landlord", admin: "/admin" };
export const ROLE_LABEL: Record<UserRole, string> = { tenant: "Tenant", landlord: "Landlord", admin: "Verification Team" };
const ROLE_ICON = { tenant: UserRound, landlord: Building2, admin: ShieldCheck };

export function UserMenu({ compact }: { compact?: boolean }) {
  const router = useZoneRouter();
  const role = useStore((s) => s.role);
  const loginDemo = useStore((s) => s.loginDemo);
  const logout = useStore((s) => s.logout);
  const resetDemo = useStore((s) => s.resetDemo);
  const user = useStore(selectCurrentUser);
  const demoIds = [useDemoAccount("tenant").id, useDemoAccount("landlord").id, useDemoAccount("admin").id];
  if (!role || !user) return null;

  const switchTo = (r: UserRole) => {
    loginDemo(r);
    router.push(ROLE_HOME[r]);
    toast.success(`Signed in to the demo ${ROLE_LABEL[r]} account`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-0.5 pr-0.5 transition-colors hover:bg-accent sm:pr-3" aria-label="Account menu">
        <UserAvatar name={user.name} hue={user.avatarHue} className="size-8" />
        {!compact && (
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-medium">{user.name.split(" ")[0]}</span>
            <span className="block text-[11px] text-muted-foreground">{ROLE_LABEL[role]}</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 px-2 py-2">
          <UserAvatar name={user.name} hue={user.avatarHue} className="size-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROLE_HOME[role]}>
            <LayoutDashboard /> Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Demo: switch account</DropdownMenuLabel>
        {(Object.keys(ROLE_HOME) as UserRole[]).map((r, i) => {
          const Icon = ROLE_ICON[r];
          const current = user.id === demoIds[i];
          return (
            <DropdownMenuItem key={r} onSelect={() => switchTo(r)} disabled={current}>
              <Icon /> {ROLE_LABEL[r]}
              {current && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuItem
          onSelect={() => {
            resetDemo();
            toast.success("Demo data reset");
          }}
        >
          <RotateCcw /> Reset demo data
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          onSelect={() => {
            logout();
            router.push(SIGNED_OUT_PATH);
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


