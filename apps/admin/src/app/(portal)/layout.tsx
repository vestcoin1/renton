import { DashboardShell } from "renton-ui/layout/dashboard-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="admin">{children}</DashboardShell>;
}


