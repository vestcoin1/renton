import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bath,
  BedDouble,
  Building,
  CalendarDays,
  ChevronRight,
  Clock,
  Droplets,
  Eye,
  GraduationCap,
  Globe,
  Hospital,
  Landmark,
  MapPin,
  Maximize,
  MessageSquare,
  Bus,
  ShieldCheck,
  ShoppingBag,
  Sofa,
  Star,
  Toilet,
  Trees,
  Church,
  Zap,
  Car,
  BadgeCheck,
} from "lucide-react";
import type { NearbyPlace } from "@/types";
import { getLandlord, getPropertyById, getSimilarProperties, getAllPropertyIds } from "@/lib/services";
import { PropertyGallery } from "@/components/property/property-gallery";
import { PropertyActions, ReportListingButton, ShareButton } from "@/components/property/property-actions";
import { SaveButton } from "@/components/property/save-button";
import { VerificationBadge } from "renton-ui/property/verification-badge";
import { PropertyCard } from "@/components/property/property-card";
import { amenityIcon } from "@/components/property/amenity-icon";
import { VerificationFlow } from "renton-ui/shared/verification-flow";
import { FadeIn } from "@/components/shared/motion";
import { UserAvatar } from "renton-ui/dashboard/widgets";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "renton-ui/ui/card";
import { Separator } from "renton-ui/ui/separator";
import { OCCUPANCY_META } from "renton-core/status";
import { formatDate, formatNaira } from "renton-core/utils";
import { moveInFees } from "renton-core/fees";
import { citySlug } from "renton-shared/reference";

const NEARBY_ICON: Record<NearbyPlace["category"], typeof MapPin> = {
  school: GraduationCap,
  hospital: Hospital,
  shopping: ShoppingBag,
  transport: Bus,
  worship: Church,
  recreation: Trees,
  bank: Landmark,
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPropertyIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getPropertyById(id);
  if (!p) return { title: "Property not found" };
  return {
    title: `${p.title} — ${p.area}, ${p.city}`,
    description: `${p.bedrooms}-bedroom ${p.type.toLowerCase()} for rent in ${p.area}, ${p.city}. ${formatNaira(p.rent)}/year. Verified by Renton.`,
    openGraph: { images: [p.images[0]] },
  };
}

export default async function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPropertyById(id);
  if (!p) notFound();
  const [landlord, similar] = await Promise.all([getLandlord(p.landlordId), getSimilarProperties(p)]);
  const occupancy = OCCUPANCY_META[p.occupancy];
  const verified = p.verification === "verified" || p.verification === "published";
  const fees = moveInFees(p, 1);

  const overview = [
    { icon: BedDouble, label: "Bedrooms", value: p.bedrooms },
    { icon: Bath, label: "Bathrooms", value: p.bathrooms },
    { icon: Toilet, label: "Toilets", value: p.toilets },
    { icon: Maximize, label: "Floor area", value: `${p.sizeSqm} m²` },
    { icon: Building, label: "Type", value: p.type },
    { icon: Sofa, label: "Furnishing", value: p.furnished ? "Furnished" : "Unfurnished" },
    { icon: Car, label: "Parking", value: p.parkingSpaces ? `${p.parkingSpaces} spaces` : "Street" },
    { icon: Droplets, label: "Water", value: p.waterSupply },
    { icon: Zap, label: "Power", value: p.power },
  ];

  return (
    <div className="container-page py-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/properties" className="hover:text-primary">
          Properties
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/cities/${citySlug(p.city)}`} className="hover:text-primary">
          {p.city}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate text-foreground">{p.area}</span>
      </nav>

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <VerificationBadge stage={p.verification} />
            <Badge variant={occupancy.variant}>
              <span className={`size-1.5 rounded-full ${occupancy.dot}`} />
              {occupancy.label}
            </Badge>
            <Badge variant="secondary">{p.type}</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl lg:text-4xl">{p.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-4 shrink-0" /> {p.address}, {p.city}, {p.state} State
          </p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <SaveButton propertyId={p.id} variant="button" />
          <ShareButton title={p.title} />
        </div>
      </div>

      <FadeIn y={8}>
        <PropertyGallery images={p.images} title={p.title} />
      </FadeIn>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-8">
          {/* Overview */}
          <section aria-labelledby="overview">
            <h2 id="overview" className="text-xl font-semibold">
              Property overview
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {overview.map((o) => (
                <div key={o.label} className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <o.icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{o.label}</p>
                    <p className="truncate text-sm font-semibold">{o.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> Listed {formatDate(p.listedAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="size-3.5" /> {p.views.toLocaleString()} views
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" /> Available {new Date(p.availableFrom) <= new Date() ? "now" : `from ${formatDate(p.availableFrom)}`}
              </span>
            </div>
          </section>

          <Separator />

          {/* Description */}
          <section aria-labelledby="description">
            <h2 id="description" className="text-xl font-semibold">
              About this home
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{p.description}</p>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Located in {p.area}, one of {p.city}&apos;s most sought-after neighbourhoods, with easy access to schools, shopping and major roads. Rent is paid annually; a refundable caution deposit
              of {formatNaira(p.cautionDeposit)} applies.
            </p>
          </section>

          <Separator />

          {/* Amenities */}
          <section aria-labelledby="amenities">
            <h2 id="amenities" className="text-xl font-semibold">
              Amenities
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {p.amenities.map((a) => {
                const Icon = amenityIcon(a);
                return (
                  <li key={a} className="flex items-center gap-2.5 text-sm">
                    <Icon className="size-[18px] text-primary" /> {a}
                  </li>
                );
              })}
            </ul>
          </section>

          <Separator />

          {/* Verification */}
          <section aria-labelledby="verification">
            <Card className="overflow-hidden">
              <CardHeader className="flex-row items-start justify-between gap-4 border-b bg-subtle">
                <div>
                  <CardTitle id="verification" className="flex items-center gap-2 text-lg">
                    <ShieldCheck className="size-5 text-success" /> Verification status
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {verified ? `Verified by Renton on ${formatDate(p.verifiedAt ?? p.listedAt)}` : "This listing is still moving through verification."}
                  </p>
                </div>
                <VerificationBadge stage={p.verification} />
              </CardHeader>
              <CardContent className="pt-6 sm:pt-6">
                <VerificationFlow stage={p.verification} />
                {verified && (
                  <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                    {["Title document authenticated", "Landlord identity confirmed", "Physical inspection completed", "Photos match the property", "Utilities tested on site", "No ownership disputes found"].map(
                      (c) => (
                        <li key={c} className="flex items-center gap-2 text-sm">
                          <BadgeCheck className="size-4 text-success" /> {c}
                        </li>
                      )
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Location */}
          <section aria-labelledby="location">
            <h2 id="location" className="text-xl font-semibold">
              Location
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.address}, {p.area}, {p.city}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_1fr]">
              <div className="relative h-64 overflow-hidden rounded-2xl border bg-brand-50 dark:bg-brand-900/40" role="img" aria-label={`Map of ${p.area}, ${p.city}`}>
                <div className="bg-grid absolute inset-0 opacity-70" />
                <svg className="absolute inset-0 size-full text-brand-500/25" viewBox="0 0 400 260" preserveAspectRatio="none" aria-hidden>
                  <path d="M0 180 C 80 150, 140 210, 220 160 S 340 100, 400 120" stroke="currentColor" strokeWidth="14" fill="none" />
                  <path d="M120 0 L 160 260" stroke="currentColor" strokeWidth="8" fill="none" />
                  <path d="M0 70 L 400 40" stroke="currentColor" strokeWidth="6" fill="none" />
                  <path d="M300 0 C 280 80, 320 160, 290 260" stroke="currentColor" strokeWidth="5" fill="none" />
                </svg>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
                  <span className="absolute left-1/2 top-full size-16 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-primary/20" />
                  <div className="relative flex flex-col items-center">
                    <span className="flex size-11 items-center justify-center rounded-full border-4 border-white bg-primary text-white shadow-lg">
                      <MapPin className="size-5" />
                    </span>
                    <span className="-mt-1 size-3 rotate-45 bg-primary" />
                  </div>
                </div>
                <span className="absolute bottom-3 left-3 rounded-lg bg-card/95 px-3 py-1.5 text-xs font-medium shadow">
                  {p.area}, {p.city}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Nearby places</h3>
                <ul className="mt-3 divide-y rounded-xl border bg-card">
                  {p.nearby.map((n) => {
                    const Icon = NEARBY_ICON[n.category];
                    return (
                      <li key={n.name} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{n.name}</span>
                        <span className="text-xs text-muted-foreground">{n.distanceKm} km</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </section>

          {/* Landlord */}
          {landlord && (
            <section aria-labelledby="landlord">
              <h2 id="landlord" className="text-xl font-semibold">
                Meet your landlord
              </h2>
              <Card className="mt-4 p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <UserAvatar name={landlord.name} hue={landlord.avatarHue} className="size-16 text-lg" />
                      {landlord.identityVerified && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border-2 border-card bg-success text-white">
                          <BadgeCheck className="size-3.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{landlord.name}</p>
                      {landlord.company && <p className="text-sm text-muted-foreground">{landlord.company}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" /> {landlord.rating}
                        </span>
                        <span>·</span>
                        <span>Joined {formatDate(landlord.joinedAt, { month: "short", year: "numeric" })}</span>
                        {landlord.isDiaspora && (
                          <Badge variant="violet" className="ml-1">
                            <Globe /> Diaspora · {landlord.residence.split(",")[0]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid flex-1 grid-cols-3 gap-3 sm:ml-auto sm:max-w-sm">
                    {[
                      { k: `${landlord.responseRate}%`, v: "Response rate" },
                      { k: landlord.responseTime.replace("within ", "< "), v: "Response time" },
                      { k: landlord.propertiesCount, v: "Listings" },
                    ].map((s) => (
                      <div key={s.v} className="rounded-xl bg-muted/60 p-2.5 text-center">
                        <p className="text-sm font-semibold">{s.k}</p>
                        <p className="text-[11px] text-muted-foreground">{s.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t pt-5">
                  <Button asChild variant="outline">
                    <Link href="/tenant/messages">
                      <MessageSquare /> Message landlord
                    </Link>
                  </Button>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="size-4 text-success" /> Identity verified with NIN &amp; government ID
                  </p>
                </div>
              </Card>
            </section>
          )}
        </div>

        {/* Sticky pricing / CTA */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden shadow-[var(--shadow-lift)]">
            <div className="border-b bg-gradient-to-br from-brand-50 to-transparent p-6 dark:from-brand-900/40">
              <p className="text-sm text-muted-foreground">Annual rent</p>
              <p className="font-display text-3xl font-bold tracking-tight">{formatNaira(p.rent)}</p>
              <p className="mt-1 text-xs text-muted-foreground">≈ {formatNaira(Math.round(p.rent / 12))} per month</p>
            </div>
            <div className="space-y-4 p-6">
              <dl className="space-y-2.5 text-sm">
                {fees.items.map((i) => (
                  <div key={i.key} className="flex justify-between">
                    <dt className="text-muted-foreground">{i.label}</dt>
                    <dd className="font-medium">{formatNaira(i.amount)}</dd>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between text-base">
                  <dt className="font-semibold">Due to Renton at move-in</dt>
                  <dd className="font-bold">{formatNaira(fees.total)}</dd>
                </div>
                {p.serviceCharge > 0 && <p className="text-xs text-muted-foreground">Plus {formatNaira(p.serviceCharge)}/yr service charge, paid to the estate.</p>}
              </dl>
              <PropertyActions property={p} />
              <p className="rounded-lg bg-success/10 p-3 text-xs text-emerald-800 dark:text-emerald-200">
                One flat 10% agency fee. No inspection, agreement or legal fees on top. You pay Renton only after the landlord approves you.
              </p>
              <ReportListingButton />
            </div>
          </Card>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-16" aria-labelledby="similar">
          <div className="flex items-end justify-between">
            <h2 id="similar" className="text-2xl font-bold tracking-tight">
              Similar verified homes
            </h2>
            <Button asChild variant="link">
              <Link href={`/properties?city=${encodeURIComponent(p.city)}`}>See more in {p.city}</Link>
            </Button>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => (
              <PropertyCard key={s.id} property={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
