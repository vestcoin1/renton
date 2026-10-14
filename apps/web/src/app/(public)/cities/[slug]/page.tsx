import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, ChevronRight, HandCoins, Home, MapPin, SlidersHorizontal } from "lucide-react";
import { getAllCitySlugs, getCityBySlug } from "@/lib/services";
import { PropertyCard } from "@/components/property/property-card";
import { FadeIn, Stagger, StaggerItem } from "@/components/shared/motion";
import { SafeImage } from "renton-ui/shared/safe-image";
import { EmptyState } from "renton-ui/shared/states";
import { Button } from "renton-ui/ui/button";
import { formatNairaCompact } from "renton-core/utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllCitySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const city = await getCityBySlug(slug);
  if (!city) return { title: "City not found" };
  return {
    title: `Verified homes for rent in ${city.name}`,
    description: `Browse ${city.properties.length} verified rentals in ${city.name}, ${city.state} State. Rent directly from landlords with no inspection fees.`,
    openGraph: { images: [city.image] },
  };
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = await getCityBySlug(slug);
  if (!city) notFound();

  const { properties } = city;
  const searchHref = `/properties?city=${encodeURIComponent(city.name)}`;
  const lowestRent = properties.length ? Math.min(...properties.map((p) => p.rent)) : undefined;
  const areaCounts = new Map(city.areas.map((a) => [a, properties.filter((p) => p.area === a).length]));

  const stats = [
    { icon: BadgeCheck, label: "Verified listings", value: String(properties.length), href: "#listings", hint: "See homes" },
    { icon: HandCoins, label: "Average rent", value: `${formatNairaCompact(city.avgRent)}/yr`, href: `${searchHref}&max=${city.avgRent}`, hint: "Homes at or below average" },
    { icon: Home, label: "Rent from", value: lowestRent != null ? `${formatNairaCompact(lowestRent)}/yr` : "—", href: `${searchHref}&sort=price-asc`, hint: "Cheapest first" },
    { icon: MapPin, label: "Neighbourhoods", value: String(city.areas.length), href: "#neighbourhoods", hint: "Browse by area" },
  ];

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <SafeImage src={city.image} alt={`Homes in ${city.name}`} fill priority sizes="100vw" className="-z-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/45 to-black/25" />
        <div className="container-page pb-12 pt-6 text-white sm:pb-16 sm:pt-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-white/75">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <ChevronRight className="size-3.5" />
            <span className="text-white">{city.name}</span>
          </nav>
          <FadeIn className="mt-20 max-w-2xl sm:mt-28">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">{city.state} State</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">Verified homes in {city.name}</h1>
            <p className="mt-3 text-lg text-white/85">{city.tagline}</p>
          </FadeIn>
        </div>
      </section>

      {/* ─── Stats ────────────────────────────────────────────── */}
      <section className="container-page relative z-10 -mt-8 sm:-mt-10">
        <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <StaggerItem key={s.label}>
              <Link
                href={s.href}
                className="group flex h-full items-center gap-3 rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <s.icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold sm:text-xl">{s.value}</p>
                  <p className="truncate text-xs text-muted-foreground sm:text-sm">{s.label}</p>
                  <p className="mt-0.5 hidden truncate text-xs font-medium text-primary sm:block">{s.hint}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ─── Neighbourhoods ───────────────────────────────────── */}
      <section id="neighbourhoods" className="container-page scroll-mt-24 pt-12">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Popular neighbourhoods</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {city.areas.map((area) => (
            <Link
              key={area}
              href={`${searchHref}&area=${encodeURIComponent(area)}`}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
            >
              {area}
              <span className="text-xs text-muted-foreground">{areaCounts.get(area)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Listings ─────────────────────────────────────────── */}
      <section id="listings" className="container-page scroll-mt-24 py-12 sm:py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Homes for rent in {city.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {properties.length} verified listing{properties.length === 1 ? "" : "s"}, inspected in person by our team.
            </p>
          </div>
          {properties.length > 0 && (
            <Button asChild variant="outline">
              <Link href={searchHref}>
                <SlidersHorizontal /> Filter these homes
              </Link>
            </Button>
          )}
        </div>

        {properties.length > 0 ? (
          <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {properties.map((p, i) => (
              <StaggerItem key={p.id}>
                <PropertyCard property={p} priority={i < 4} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <EmptyState
            className="mt-8"
            icon={Home}
            title={`No verified homes in ${city.name} yet`}
            description="New listings are being inspected. Browse other cities or check back soon."
            action={{ label: "Browse all properties", href: "/properties" }}
          />
        )}

        {properties.length > 0 && (
          <div className="mt-10 text-center">
            <Button asChild>
              <Link href={searchHref}>
                Search {city.name} with filters <ArrowRight />
              </Link>
            </Button>
          </div>
        )}
      </section>
    </>
  );
}
