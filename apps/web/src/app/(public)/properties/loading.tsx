import { PropertyCardSkeleton } from "@/components/property/property-card";
import { Skeleton } from "renton-ui/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page py-8">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="mt-2 h-4 w-48" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <Skeleton className="hidden h-[600px] rounded-2xl lg:block" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}


