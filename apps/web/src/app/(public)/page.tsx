import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FileCheck2,
  HandCoins,
  KeyRound,
  Search,
  ShieldCheck,
  Star,
  Globe,
  Headset,
  Wrench,
  Quote,
} from "lucide-react";
import { HeroSearch } from "@/components/search/hero-search";
import { PropertyCard } from "@/components/property/property-card";
import { FadeIn, Stagger, StaggerItem } from "@/components/shared/motion";
import { SafeImage } from "renton-ui/shared/safe-image";
import { VerificationFlow } from "renton-ui/shared/verification-flow";
import { MatchScoreCard } from "@/components/shared/match-score";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "renton-ui/ui/accordion";
import { Button } from "renton-ui/ui/button";
import { UserAvatar } from "renton-ui/dashboard/widgets";
import { getCityStats, getFeaturedProperties } from "@/lib/services";
import { FAQS, TESTIMONIALS } from "@/lib/content";
import { HERO_IMAGE } from "renton-core/assets";
import { formatNairaCompact } from "renton-core/utils";

function SectionHeading({ eyebrow, title, description, center }: { eyebrow: string; title: string; description?: string; center?: boolean }) {
  return (
    <FadeIn className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {description && <p className="mt-3 text-base text-muted-foreground sm:text-lg">{description}</p>}
    </FadeIn>
  );
}

const STEPS = [
  { icon: Search, title: "Find a Diaspora-Owned Home", body: "Browse apartments owned by Nigerians abroad, each one title-checked and physically inspected by our field team." },
  { icon: FileCheck2, title: "Apply Online", body: "Send one reusable rental profile. No caretaker to impress, no middlemen, no inspection fees." },
  { icon: KeyRound, title: "Move In, We Handle the Rest", body: "Rent, repairs and requests all go through renton. No chasing an unreachable landlord." },
];

const BENEFITS = [
  { icon: Globe, title: "Diaspora-Owned Homes", body: "Well-kept apartments owned by Nigerians in the UK, US, Canada and beyond, verified and inspected before they go live.", tone: "bg-success/10 text-emerald-600 dark:text-emerald-400" },
  { icon: Headset, title: "No Landlord Wahala", body: "No unreachable landlord, no overbearing caretaker, no surprise visits. renton is your one point of contact on the ground.", tone: "bg-primary/10 text-primary" },
  { icon: Wrench, title: "Repairs Handled", body: "Report an issue in the app and we send vetted artisans, keeping you updated until it's fixed.", tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { icon: HandCoins, title: "Clear Terms, Fair Fees", body: "A written tenancy and one flat 10% fee. No inspection fees, no surprise levies, no harassment.", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
];

export default async function HomePage() {
  const [featured, cities] = await Promise.all([getFeaturedProperties(8), getCityStats()]);

  return (
    <>
      {/* â”€â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-20 bg-gradient-to-b from-brand-50 via-background to-background dark:from-brand-900/40" />
        <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)]" />
        <div className="absolute -right-40 -top-40 -z-10 size-[520px] rounded-full bg-success/15 blur-3xl" />
        <div className="absolute -left-40 top-40 -z-10 size-[420px] rounded-full bg-primary/15 blur-3xl" />

        <div className="container-page grid grid-cols-1 items-center gap-12 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24 lg:pt-20">
          <div className="min-w-0">
            <FadeIn>
              <Link
                href="/diaspora"
                className="group inline-flex items-center gap-2 rounded-full border bg-card/80 py-1 pl-1 pr-3 text-xs font-medium shadow-sm backdrop-blur transition-colors hover:border-primary/40"
              >
                <span className="rounded-full bg-success px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
                Live abroad? List your Nigerian property with us
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </FadeIn>
            <FadeIn delay={0.05}>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Rent Homes Owned by Nigerians Abroad.{" "}
                <span className="bg-gradient-to-r from-brand-600 to-emerald-500 bg-clip-text text-transparent dark:from-sky-400 dark:to-emerald-400">No Landlord Wahala.</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground sm:text-xl">
                Quality apartments owned by Nigerians in the diaspora, verified and managed on the ground by renton. One team for your rent, repairs and everything in between.
              </p>
            </FadeIn>
            <FadeIn delay={0.15} className="mt-8">
              <HeroSearch />
            </FadeIn>
            <FadeIn delay={0.2}>
              <dl className="mt-8 grid max-w-lg grid-cols-3 gap-6">
                {[
                  { k: "2,400+", v: "Verified homes" },
                  { k: "â‚¦0", v: "Inspection fees" },
                  { k: "72hrs", v: "Avg. verification" },
                ].map((s) => (
                  <div key={s.v}>
                    <dt className="sr-only">{s.v}</dt>
                    <dd className="font-display text-2xl font-bold sm:text-3xl">{s.k}</dd>
                    <dd className="text-xs text-muted-foreground sm:text-sm">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </FadeIn>
          </div>

          <FadeIn delay={0.15} className="relative hidden lg:block">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-2xl shadow-brand-900/20">
              <SafeImage src={HERO_IMAGE} alt="Modern verified home in Lekki, Lagos" fill priority sizes="40vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <p className="text-sm text-white/80">Lekki Phase 1, Lagos</p>
                <p className="font-display text-xl font-bold">Serene 3-Bedroom Apartment</p>
              </div>
            </div>
            <div className="absolute -left-10 top-10 flex items-center gap-3 rounded-2xl border bg-card p-3 pr-5 shadow-xl">
              <span className="flex size-10 items-center justify-center rounded-xl bg-success/15 text-emerald-600">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Verified property</p>
                <p className="text-xs text-muted-foreground">Owner in London Â· Managed by renton</p>
              </div>
            </div>
            <div className="absolute -right-6 bottom-28 rounded-2xl border bg-card p-4 shadow-xl">
              <MatchScoreCard
                compact
                match={{
                  score: 92,
                  reasons: [
                    { label: "Preferred area", met: true },
                    { label: "Within budget", met: true },
                    { label: "Available immediately", met: true },
                  ],
                }}
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* â”€â”€â”€ Featured â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="container-page py-16 sm:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Featured" title="Diaspora-owned homes, ready for you" description="Owned by Nigerians abroad, inspected in person by our team and managed by renton." />
          <Button asChild variant="outline">
            <Link href="/properties">
              View all properties <ArrowRight />
            </Link>
          </Button>
        </div>
        <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p, i) => (
            <StaggerItem key={p.id}>
              <PropertyCard property={p} priority={i < 4} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* â”€â”€â”€ How it works â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="border-y bg-subtle py-16 sm:py-20">
        <div className="container-page">
          <SectionHeading center eyebrow="How it works" title="From search to keys in three steps" />
          <Stagger className="relative mt-12 grid gap-6 md:grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-8 hidden border-t-2 border-dashed border-primary/25 md:block" />
            {STEPS.map((s, i) => (
              <StaggerItem key={s.title} className="relative text-center">
                <div className="relative mx-auto flex size-16 items-center justify-center rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
                  <s.icon className="size-7 text-primary" />
                  <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-success text-xs font-bold text-white">{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">
                  Step {i + 1}: {s.title}
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{s.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* â”€â”€â”€ Verification workflow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="container-page py-16 sm:py-20">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-6 text-white shadow-2xl shadow-brand-900/20 sm:p-10 lg:p-14">
          <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <FadeIn>
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Our verification promise</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Every listing passes six stages before you see it</h2>
              <p className="mt-4 text-white/80">
                Fake listings cost Nigerian renters billions every year. We physically inspect every property and verify the owner&apos;s title and identity, so the home you see is real.
              </p>
            </FadeIn>
            <FadeIn delay={0.1} className="rounded-2xl bg-white p-5 text-foreground shadow-xl dark:bg-card sm:p-8">
              <VerificationFlow stage="published" />
              <div className="mt-6 grid gap-3 border-t pt-6 sm:grid-cols-3">
                {["Title checked at land registry", "Owner KYC & NIN verified", "Field officer inspection"].map((t) => (
                  <p key={t} className="flex items-start gap-2 text-sm">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" /> {t}
                  </p>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* â”€â”€â”€ Benefits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="container-page pb-16 sm:pb-20">
        <SectionHeading center eyebrow="Why renton" title="The owner is abroad. We're right here." description="You get a quality home without the landlord wahala. Our team on the ground handles everything the owner would." />
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <StaggerItem key={b.title} className="group rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
              <div className={`flex size-12 items-center justify-center rounded-xl ${b.tone} transition-transform group-hover:scale-110`}>
                <b.icon className="size-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* â”€â”€â”€ Cities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="border-y bg-subtle py-16 sm:py-20">
        <div className="container-page">
          <SectionHeading eyebrow="Cities" title="Explore homes across Nigeria" />
          <Stagger className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
            {cities.map((c, i) => (
              <StaggerItem key={c.name} className={i === 0 ? "col-span-2 md:col-span-1 md:row-span-2" : ""}>
                <Link
                  href={`/cities/${c.slug}`}
                  className="group relative flex h-full min-h-44 overflow-hidden rounded-2xl sm:min-h-56"
                >
                  <SafeImage src={c.image} alt={`Homes in ${c.name}`} fill sizes="(max-width: 768px) 50vw, 33vw" className="transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="relative mt-auto w-full p-4 text-white sm:p-5">
                    <p className="text-xs text-white/75">{c.tagline}</p>
                    <h3 className="font-display text-xl font-bold sm:text-2xl">{c.name}</h3>
                    <div className="mt-1 flex items-center justify-between text-xs text-white/85 sm:text-sm">
                      <span>
                        {c.listings} verified listing{c.listings === 1 ? "" : "s"}
                      </span>
                      <span className="hidden sm:inline">Avg. {formatNairaCompact(c.avgRent)}/yr</span>
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* â”€â”€â”€ Testimonials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="container-page py-16 sm:py-20">
        <SectionHeading center eyebrow="Testimonials" title="Loved by tenants and landlords" />
        <Stagger className="mt-12 grid gap-5 md:grid-cols-2">
          {TESTIMONIALS.map((t, i) => (
            <StaggerItem key={t.name} className="relative rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
              <Quote className="absolute right-6 top-6 size-8 text-primary/10" />
              <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="size-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="mt-4 text-[15px] leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <UserAvatar name={t.name} hue={[200, 320, 140, 30][i]} />
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </figcaption>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* â”€â”€â”€ FAQ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="border-t bg-subtle py-16 sm:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHeading eyebrow="FAQ" title="Questions, answered" description="Can't find what you're looking for? Our support team replies within an hour." />
            <Button asChild variant="outline" className="mt-6">
              <Link href="/contact">Contact support</Link>
            </Button>
          </div>
          <FadeIn>
            <Accordion type="single" collapsible defaultValue="item-0" className="rounded-2xl border bg-card px-5 shadow-[var(--shadow-soft)] sm:px-7">
              {FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`item-${i}`} className="last:border-0">
                  <AccordionTrigger>{f.q}</AccordionTrigger>
                  <AccordionContent>{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeIn>
        </div>
      </section>

      {/* â”€â”€â”€ CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="container-page py-16 sm:py-20">
        <div className="grid gap-5 md:grid-cols-2">
          <FadeIn className="relative overflow-hidden rounded-3xl bg-brand-900 p-8 text-white sm:p-10">
            <div className="absolute -right-16 -top-16 size-56 rounded-full bg-primary/40 blur-3xl" />
            <Building2 className="size-8 text-emerald-300" />
            <h3 className="mt-4 text-2xl font-bold">Living abroad with property at home?</h3>
            <p className="mt-2 max-w-sm text-white/75">List for free. We verify, find a pre-screened tenant, collect rent and handle maintenance while you&apos;re away.</p>
            <Button asChild variant="white" className="mt-6">
              <Link href="/diaspora">
                Explore diaspora services <ArrowRight />
              </Link>
            </Button>
          </FadeIn>
          <FadeIn delay={0.08} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 text-white sm:p-10">
            <div className="absolute -bottom-16 -right-16 size-56 rounded-full bg-white/20 blur-3xl" />
            <KeyRound className="size-8 text-white" />
            <h3 className="mt-4 text-2xl font-bold">Looking for a home?</h3>
            <p className="mt-2 max-w-sm text-white/85">Join the waiting list and get matched with diaspora-owned homes that fit your area and budget.</p>
            <Button asChild variant="white" className="mt-6 text-emerald-700">
              <Link href="/waiting-list">
                Join the waiting list <ArrowRight />
              </Link>
            </Button>
          </FadeIn>
        </div>
      </section>
    </>
  );
}


