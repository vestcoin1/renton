"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { VerificationStage } from "renton-shared/types";
import { useStore } from "renton-core/store";
import { PageHeader } from "renton-ui/dashboard/widgets";
import { ReviewCard } from "@/components/review-card";
import { EmptyState } from "renton-ui/shared/states";
import { Tabs, TabsList, TabsTrigger } from "renton-ui/ui/tabs";

const TABS: { value: string; label: string; stages: VerificationStage[] }[] = [
  { value: "open", label: "All open", stages: ["submitted", "inspection_scheduled", "under_review"] },
  { value: "submitted", label: "Submitted", stages: ["submitted"] },
  { value: "inspection", label: "Inspection", stages: ["inspection_scheduled"] },
  { value: "review", label: "Under review", stages: ["under_review"] },
  { value: "returned", label: "Changes requested", stages: ["changes_requested"] },
  { value: "closed", label: "Closed", stages: ["published", "verified", "rejected"] },
];

export default function VerificationQueuePage() {
  const verifications = useStore((s) => s.verifications);
  const properties = useStore((s) => s.properties);
  const users = useStore((s) => s.users);
  const [tab, setTab] = useState("open");
  const byId = new Map(properties.map((p) => [p.id, p]));
  const usersById = new Map(users.map((u) => [u.id, u]));
  const stageOf = (propertyId: string) => byId.get(propertyId)?.verification;
  const current = TABS.find((t) => t.value === tab)!;
  const list = verifications.filter((v) => current.stages.includes(stageOf(v.propertyId)!));

  return (
    <>
      <PageHeader title="Verification queue" description="Review documents, inspection reports and listing quality before properties go live." />
      <Tabs value={tab} onValueChange={setTab} className="mb-5">
        <TabsList className="h-auto flex-wrap justify-start">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              <span className="text-[11px] text-muted-foreground">{verifications.filter((v) => t.stages.includes(stageOf(v.propertyId)!)).length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {list.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nothing in this stage" description="Listings will appear here as they move through verification." />
      ) : (
        <div className="grid gap-4 2xl:grid-cols-2">
          {list.map((v) => {
            const p = byId.get(v.propertyId);
            if (!p) return null;
            return <ReviewCard key={v.id} request={v} property={p} landlord={usersById.get(p.landlordId)} />;
          })}
        </div>
      )}
    </>
  );
}


