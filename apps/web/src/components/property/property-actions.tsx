"use client";

import Link from "next/link";
import { Flag, ListPlus, Send, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { Property } from "@/types";
import { Button } from "renton-ui/ui/button";
import { ApplyDialog } from "./apply-dialog";
import { SaveButton } from "./save-button";
import { filtersToParams } from "@/lib/search";

export function ShareButton({ title, className }: { title: string; className?: string }) {
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `Check out this verified home on renton: ${title}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("Couldn't share this listing");
    }
  };
  return (
    <Button variant="outline" onClick={share} className={className}>
      <Share2 /> Share
    </Button>
  );
}

export function PropertyActions({ property }: { property: Property }) {
  const waitlistHref = `/waiting-list?${filtersToParams({ city: property.city, area: property.area, type: property.type, bedrooms: property.bedrooms }).toString()}`;
  const occupied = property.occupancy === "occupied";
  return (
    <div className="grid gap-2">
      {occupied ? (
        <Button asChild size="lg" className="w-full">
          <Link href={waitlistHref}>
            <ListPlus /> Join Waiting List
          </Link>
        </Button>
      ) : (
        <>
          <ApplyDialog property={property}>
            <Button size="lg" className="w-full">
              <Send /> Apply Now
            </Button>
          </ApplyDialog>
          <Button asChild size="lg" variant="success" className="w-full">
            <Link href={waitlistHref}>
              <ListPlus /> Join Waiting List
            </Link>
          </Button>
        </>
      )}
      <div className="grid grid-cols-2 gap-2">
        <SaveButton propertyId={property.id} variant="button" />
        <ShareButton title={property.title} />
      </div>
    </div>
  );
}

export function ReportListingButton() {
  return (
    <button
      type="button"
      onClick={() => toast.success("Report submitted", { description: "Our trust & safety team will review this listing within 24 hours." })}
      className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-destructive hover:underline"
    >
      <Flag className="size-3.5" /> Report this listing
    </button>
  );
}


