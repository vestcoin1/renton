import type { Metadata } from "next";
import { DashboardShell } from "renton-ui/layout/dashboard-shell";

export const metadata: Metadata = { title: { default: "Landlord Portal", template: "%s Â· Landlord Â· renton" } };

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="landlord">{children}</DashboardShell>;
}


