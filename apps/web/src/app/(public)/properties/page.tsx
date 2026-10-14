import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchView } from "@/components/search/search-view";
import { getPublicProperties } from "@/lib/services";
import Loading from "./loading";

export const metadata: Metadata = {
  title: "Search verified homes",
  description: "Filter verified rentals by state, city, area, budget, bedrooms and amenities across Nigeria.",
};

export default async function PropertiesPage() {
  const properties = await getPublicProperties();
  return (
    <Suspense fallback={<Loading />}>
      <SearchView properties={properties} />
    </Suspense>
  );
}
