"use client";

import { useState } from "react";
import { Building2, CircleCheck, Eye, Flag, ShieldAlert, UserRound, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Report, ReportCategory } from "renton-shared/types";
import { useStore } from "renton-core/store";
import { PageHeader, StatCard } from "renton-ui/dashboard/widgets";
import { EmptyState } from "renton-ui/shared/states";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card } from "renton-ui/ui/card";
import { Tabs, TabsList, TabsTrigger } from "renton-ui/ui/tabs";
import { REPORT_STATUS_META, SEVERITY_META } from "renton-core/status";
import { cn, timeAgo } from "renton-core/utils";

const CATS: { value: ReportCategory; label: string; icon: typeof Flag }[] = [
  { value: "fraud", label: "Fraud Reports", icon: ShieldAlert },
  { value: "property", label: "Property Reports", icon: Building2 },
  { value: "user", label: "User Reports", icon: UserRound },
];

const SEVERITY_BAR: Record<Report["severity"], string> = {
  critical: "bg-destructive",
  high: "bg-amber-500",
  medium: "bg-primary",
  low: "bg-muted-foreground/40",
};

export default function ReportsPage() {
  const reports = useStore((s) => s.reports);
  const setStatus = useStore((s) => s.setReportStatus);
  const [cat, setCat] = useState<ReportCategory>("fraud");
  const list = reports.filter((r) => r.category === cat);

  const act = (r: Report, status: Report["status"]) => {
    setStatus(r.id, status);
    toast.success(`Report ${REPORT_STATUS_META[status].label.toLowerCase()}`, { description: r.subject });
  };

  return (
    <>
      <PageHeader title="Reports" description="Investigate fraud, misrepresented listings and user conduct." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Open reports" value={reports.filter((r) => r.status === "open").length} icon={Flag} tone="amber" />
        <StatCard index={1} label="Investigating" value={reports.filter((r) => r.status === "investigating").length} icon={Eye} tone="violet" />
        <StatCard index={2} label="Critical" value={reports.filter((r) => r.severity === "critical" && r.status !== "resolved").length} icon={ShieldAlert} tone="rose" />
        <StatCard index={3} label="Resolved (30d)" value={reports.filter((r) => r.status === "resolved").length + 41} icon={CircleCheck} tone="emerald" />
      </div>

      <Tabs value={cat} onValueChange={(v) => setCat(v as ReportCategory)} className="mb-5">
        <TabsList className="h-auto flex-wrap">
          {CATS.map((c) => (
            <TabsTrigger key={c.value} value={c.value}>
              <c.icon className="size-4" /> {c.label}
              <span className="text-[11px] text-muted-foreground">{reports.filter((r) => r.category === c.value).length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {list.length === 0 ? (
        <EmptyState icon={CircleCheck} title="No reports" description="Nothing has been reported in this category." />
      ) : (
        <div className="space-y-3">
          {list.map((r) => {
            const sev = SEVERITY_META[r.severity];
            const st = REPORT_STATUS_META[r.status];
            const closed = r.status === "resolved" || r.status === "dismissed";
            return (
              <Card key={r.id} className={cn("relative overflow-hidden p-5 pl-6", closed && "opacity-70")}>
                <span className={cn("absolute inset-y-0 left-0 w-1", SEVERITY_BAR[r.severity])} />
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={sev.variant}>{sev.label}</Badge>
                      <Badge variant={st.variant}>{st.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        #{r.id.toUpperCase()} Â· {timeAgo(r.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold">{r.subject}</p>
                    <p className="text-sm font-medium text-muted-foreground">{r.reason}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{r.details}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Reported by {r.reportedBy}</p>
                  </div>
                  {!closed && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {r.status === "open" && (
                        <Button size="sm" variant="outline" onClick={() => act(r, "investigating")}>
                          <Eye /> Investigate
                        </Button>
                      )}
                      <Button size="sm" variant="success" onClick={() => act(r, "resolved")}>
                        <CircleCheck /> Resolve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => act(r, "dismissed")}>
                        <XCircle /> Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}


