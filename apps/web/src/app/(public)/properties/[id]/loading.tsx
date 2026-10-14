import { Skeleton } from "renton-ui/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page py-8">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-5 h-6 w-40" />
      <Skeleton className="mt-3 h-10 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/3" />
      <div className="mt-6 grid h-[280px] grid-cols-4 grid-rows-2 gap-2 sm:h-[420px] lg:h-[480px]">
        <Skeleton className="col-span-4 row-span-2 rounded-2xl sm:col-span-2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="hidden rounded-xl sm:block" />
        ))}
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
