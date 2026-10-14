"use client";

import { Heart } from "lucide-react";
import { useTenantData } from "renton-core/hooks";
import { PageHeader } from "renton-ui/dashboard/widgets";
import { PropertyCard } from "@/components/property/property-card";
import { EmptyState } from "renton-ui/shared/states";
import { Stagger, StaggerItem } from "@/components/shared/motion";

export default function SavedPage() {
  const { saved } = useTenantData();
  return (
    <>
      <PageHeader title="Saved properties" description={`${saved.length} home${saved.length === 1 ? "" : "s"} on your shortlist.`} />
      {saved.length === 0 ? (
        <EmptyState icon={Heart} title="No saved homes yet" description="Tap the heart on any listing to build your shortlist and compare later." action={{ label: "Browse verified homes", href: "/properties" }} />
      ) : (
        <Stagger inView={false} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map((p) => (
            <StaggerItem key={p.id}>
              <PropertyCard property={p} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}


