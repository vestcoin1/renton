import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BarChart3, CalendarClock, FileText, HandCoins, Users } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/shared/motion";
import { SafeImage } from "renton-ui/shared/safe-image";
import { VerificationFlow } from "renton-ui/shared/verification-flow";
import { Button } from "renton-ui/ui/button";
import { LANDLORD_IMAGE } from "renton-core/assets";

export const metadata: Metadata = {
  title: "Become a landlord",
  description: "List your property for free, get verified, and rent directly to pre-screened tenants across Nigeria.",
};

const PERKS = [
  { icon: Users, t: "Pre-screened tenants", d: "Applicants come with verified ID, employment and guarantor details." },
  { icon: HandCoins, t: "Free to list", d: "No listing fees. A small success fee applies only when you sign a tenant." },
  { icon: BadgeCheck, t: "Verified badge", d: "Verified listings get 3Ã— more applications than unverified ones." },
  { icon: CalendarClock, t: "Vacancy tools", d: "Mark units as vacant, occupied or available soon to manage demand." },
  { icon: FileText, t: "Digital tenancy", d: "Generate and e-sign tenancy agreements without a lawyer queue." },
  { icon: BarChart3, t: "Portfolio insights", d: "Track occupancy, applications and rent across every property." },
];

export default function BecomeLandlordPage() {
  return (
    <>
      <section className="container-page grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-2">
        <div>
          <FadeIn>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">For landlords</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">Let your property to great tenants, without agents</h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">List in minutes. We verify your property, screen applicants and help you fill vacancies faster.</p>
          </FadeIn>
          <FadeIn delay={0.1} className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup?role=landlord">
                List your property <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/diaspora">I live abroad</Link>
            </Button>
          </FadeIn>
        </div>
        <FadeIn delay={0.1} className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-2xl">
          <SafeImage src={LANDLORD_IMAGE} alt="Modern home listed on renton" fill priority sizes="(max-width: 1024px) 100vw, 50vw" />
        </FadeIn>
      </section>

      <section className="border-y bg-subtle py-16">
        <div className="container-page">
          <h2 className="text-center text-3xl font-bold tracking-tight">How verification works</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">Most listings go from draft to published in under 72 hours.</p>
          <div className="mx-auto mt-10 max-w-4xl rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-10">
            <VerificationFlow stage="published" />
          </div>
        </div>
      </section>

      <section className="container-page py-16 sm:py-20">
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PERKS.map((p) => (
            <StaggerItem key={p.t} className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
              <p.icon className="size-6 text-primary" />
              <h3 className="mt-4 font-semibold">{p.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.d}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </>
  );
}


