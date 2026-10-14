"use client";

import { useState } from "react";
import { House, Star, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useTenantData } from "renton-core/hooks";
import { useStore } from "renton-core/store";
import { PageHeader } from "renton-ui/dashboard/widgets";
import { EmptyState } from "renton-ui/shared/states";
import { MaintenanceRequestCard } from "renton-ui/maintenance/request-card";
import { MaintenanceDetailSheet } from "renton-ui/maintenance/request-detail-sheet";
import { NewRepairDialog } from "@/components/maintenance/new-request-dialog";
import { OPEN_STATUSES } from "renton-ui/maintenance/meta";
import { Button } from "renton-ui/ui/button";
import { Tabs, TabsList, TabsTrigger } from "renton-ui/ui/tabs";
import { Textarea } from "renton-ui/ui/textarea";
import { cn } from "renton-core/utils";

function RateRepair({ id, onDone }: { id: string; onDone: () => void }) {
  const rate = useStore((s) => s.rateMaintenance);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">How did the repair go?</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)}>
            <Star className={cn("size-7 transition-colors", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40 hover:text-amber-300")} />
          </button>
        ))}
      </div>
      <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment about the technician" aria-label="Comment" />
      <Button
        className="w-full"
        disabled={!rating}
        onClick={() => {
          rate(id, rating, comment.trim() || undefined);
          toast.success("Thanks for your feedback!");
          onDone();
        }}
      >
        Submit rating
      </Button>
    </div>
  );
}

export default function TenantRepairsPage() {
  const { lease, maintenance, byId } = useTenantData();
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = maintenance.find((m) => m.id === selectedId) ?? null;

  if (!lease) {
    return (
      <>
        <PageHeader title="Repairs" />
        <EmptyState icon={House} title="Repairs open once you move in" description="When you rent a home through renton, you can report problems here with photos and videos." action={{ label: "Find a home", href: "/properties" }} />
      </>
    );
  }

  const open = maintenance.filter((m) => OPEN_STATUSES.includes(m.status));
  const closed = maintenance.filter((m) => !OPEN_STATUSES.includes(m.status));
  const list = (tab === "open" ? open : closed).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const property = byId.get(lease.propertyId);

  return (
    <>
      <PageHeader
        title="Repairs"
        description={`Report a problem in ${lease.unit}, ${property?.area}. We investigate, your landlord approves, and we send a vetted technician.`}
        actions={
          <NewRepairDialog lease={lease}>
            <Button>
              <Wrench /> Request a repair
            </Button>
          </NewRepairDialog>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-5">
        <TabsList>
          <TabsTrigger value="open">
            In progress <span className="text-[11px] text-muted-foreground">{open.length}</span>
          </TabsTrigger>
          <TabsTrigger value="closed">
            Completed <span className="text-[11px] text-muted-foreground">{closed.length}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {list.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={tab === "open" ? "No open repairs" : "No completed repairs yet"}
          description={tab === "open" ? "Something not working? Report it with photos or a short video." : "Finished repairs will show up here."}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((m) => (
            <MaintenanceRequestCard
              key={m.id}
              request={m}
              perspective="tenant"
              onOpen={() => setSelectedId(m.id)}
              highlight={m.status === "completed" && !m.tenantFeedback}
            />
          ))}
        </div>
      )}
      <MaintenanceDetailSheet
        request={selected}
        property={property}
        perspective="tenant"
        onClose={() => setSelectedId(null)}
        actions={selected?.status === "completed" && !selected.tenantFeedback ? <RateRepair id={selected.id} onDone={() => setSelectedId(null)} /> : undefined}
      />
    </>
  );
}


