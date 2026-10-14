import type { Metadata } from "next";
import { DashboardShell } from "renton-ui/layout/dashboard-shell";

export const metadata: Metadata = { title: { default: "Tenant Portal", template: "%s Â· Tenant Â· renton" } };

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="tenant">{children}</DashboardShell>;
}


