"use client";

import { useMemo } from "react";
import { selectCurrentUser, useStore } from "./store";
import type { LandlordProfile, TenantProfile, UserRole } from "renton-shared/types";
import { DEMO_ACCOUNTS } from "./mock/users";
import { LANDLORD_ACTIVITY, TENANT_ACTIVITY, THREADS } from "./mock/records";
import { TECHNICIANS } from "./mock/maintenance";
import { isPublic } from "./mock/properties";

/** The signed-in user (null when signed out). Becomes the Supabase session + profiles row. */
export function useCurrentUser() {
  return useStore(selectCurrentUser);
}

/**
 * Portal pages render inside DashboardShell, which only mounts them once the session role matches,
 * so the role's demo account is just a type-safe fallback for the first render.
 */
function useSessionAccount<R extends "tenant" | "landlord">(role: R) {
  const user = useCurrentUser();
  return (user?.role === role ? user : DEMO_ACCOUNTS[role]) as R extends "tenant" ? TenantProfile : LandlordProfile;
}

/** Selectors scoped to the signed-in user. Replace with Supabase queries filtered by auth.uid(). */
export function useTenantData() {
  const properties = useStore((s) => s.properties);
  const applications = useStore((s) => s.applications);
  const waitingLists = useStore((s) => s.waitingLists);
  const savedIds = useStore((s) => s.savedIds);
  const leases = useStore((s) => s.leases);
  const maintenance = useStore((s) => s.maintenance);
  const invoices = useStore((s) => s.invoices);
  const refunds = useStore((s) => s.refunds);
  const rentPlans = useStore((s) => s.rentPlans);
  const tenant = useSessionAccount("tenant");
  const tenantId = tenant.id;

  return useMemo(() => {
    const byId = new Map(properties.map((p) => [p.id, p]));
    return {
      tenant,
      byId,
      publicProperties: properties.filter(isPublic),
      saved: savedIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p),
      applications: applications.filter((a) => a.tenantId === tenantId),
      waitingLists: waitingLists.filter((w) => w.tenantId === tenantId),
      /** The home the tenant currently lives in (repairs + rent countdown require one). */
      lease: leases
        .filter((l) => l.tenantId === tenantId && l.status !== "ended")
        .sort((a, b) => +new Date(b.leaseStart) - +new Date(a.leaseStart))[0],
      invoices: invoices.filter((i) => i.tenantId === tenantId),
      refunds: refunds.filter((r) => r.tenantId === tenantId),
      rentPlans: rentPlans.filter((p) => p.tenantId === tenantId),
      maintenance: maintenance.filter((m) => m.tenantId === tenantId),
    };
  }, [properties, applications, waitingLists, savedIds, leases, maintenance, invoices, refunds, rentPlans, tenant, tenantId]);
}

export function useLandlordData() {
  const properties = useStore((s) => s.properties);
  const applications = useStore((s) => s.applications);
  const leases = useStore((s) => s.leases);
  const users = useStore((s) => s.users);
  const maintenance = useStore((s) => s.maintenance);
  const invoices = useStore((s) => s.invoices);
  const refunds = useStore((s) => s.refunds);
  const rentPlans = useStore((s) => s.rentPlans);
  const landlord = useSessionAccount("landlord");
  const landlordId = landlord.id;

  return useMemo(() => {
    const mine = properties.filter((p) => p.landlordId === landlordId);
    const ids = new Set(mine.map((p) => p.id));
    const byId = new Map(properties.map((p) => [p.id, p]));
    const usersById = new Map(users.map((u) => [u.id, u]));
    return {
      landlord,
      properties: mine,
      byId,
      usersById,
      applications: applications.filter((a) => ids.has(a.propertyId)),
      leases: leases.filter((l) => ids.has(l.propertyId)),
      maintenance: maintenance.filter((m) => ids.has(m.propertyId)),
      invoices: invoices.filter((i) => ids.has(i.propertyId)),
      refunds: refunds.filter((r) => ids.has(r.propertyId)),
      rentPlans: rentPlans.filter((p) => ids.has(p.propertyId)),
    };
  }, [properties, applications, leases, users, maintenance, invoices, refunds, rentPlans, landlord, landlordId]);
}

/** Published listings everyone can browse. */
export function usePublicProperties() {
  const properties = useStore((s) => s.properties);
  return useMemo(() => properties.filter(isPublic), [properties]);
}

/** The seeded account for a role (listed on the login page). */
export function useDemoAccount<R extends UserRole>(role: R) {
  return DEMO_ACCOUNTS[role];
}

/** True when the signed-in user is one of the seeded demo accounts, which come with sample threads and activity. */
function useIsDemoUser() {
  const userId = useStore((s) => s.userId);
  return Object.values(DEMO_ACCOUNTS).some((a) => a.id === userId);
}

export function useLandlordProfile(id?: string) {
  return useStore((s) => s.users.find((u): u is LandlordProfile => u.id === id && u.role === "landlord"));
}

export function useTechnicians() {
  return TECHNICIANS;
}

export function useMessageThreads() {
  return useIsDemoUser() ? THREADS : [];
}

export function useActivityFeed(role: "tenant" | "landlord") {
  const demo = useIsDemoUser();
  if (!demo) return [];
  return role === "tenant" ? TENANT_ACTIVITY : LANDLORD_ACTIVITY;
}


