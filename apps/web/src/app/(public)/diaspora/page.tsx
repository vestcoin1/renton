import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  CircleCheck,
  ClipboardCheck,
  Clock,
  Globe,
  Hammer,
  LineChart,
  ShieldCheck,
  Video,
  Wallet,
  Wrench,
} from "lucide-react";
import { BrowserFrame } from "@/components/marketing/browser-frame";
import { FadeIn, Stagger, StaggerItem } from "@/components/shared/motion";
import { SafeImage } from "renton-ui/shared/safe-image";
import { Button } from "renton-ui/ui/button";
import { Badge } from "renton-ui/ui/badge";
import { VerificationFlow } from "renton-ui/shared/verification-flow";
import { INTERIORS, EXTERIORS } from "renton-core/assets";

export const metadata: Metadata = {
  title: "Diaspora landlords â€” manage your Nigerian property from anywhere",
  description: "Property inspection, verification, rent monitoring and maintenance coordination for Nigerians abroad.",
};

const FEATURES = [
  { icon: ClipboardCheck, title: "Property Inspection", body: "Quarterly in-person inspections by vetted field officers, with geo-tagged photos and video walkthroughs sent to your dashboard.", tone: "bg-primary/10 text-primary" },
  { icon: BadgeCheck, title: "Property Verification", body: "We verify your title and listing so tenants trust you, and so nobody can list your property without your consent.", tone: "bg-success/10 text-emerald-600 dark:text-emerald-400" },
  { icon: LineChart, title: "Rent Monitoring", body: "Track every naira. See when rent is due, received or late, and get statements in â‚¦, Â£, $ or â‚¬.", tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { icon: Wrench, title: "Maintenance Coordination", body: "Tenants log issues; we dispatch trusted artisans, share quotes for your approval, and send before-and-after photos.", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
];

const RENT = [
  { m: "May", v: 62 },
  { m: "Jun", v: 70 },
  { m: "Jul", v: 70 },
  { m: "Aug", v: 84 },
  { m: "Sep", v: 84 },
  { m: "Oct", v: 100 },
];

function RentDashboardMock() {
  return (
    <div className="grid gap-3 bg-subtle p-4 text-left sm:grid-cols-3 sm:p-5">
      {[
        { k: "â‚¦38.2M", v: "Rent collected YTD", c: "text-foreground" },
        { k: "4 / 4", v: "Units occupied", c: "text-emerald-600" },
        { k: "0", v: "Late payments", c: "text-primary" },
      ].map((s) => (
        <div key={s.v} className="rounded-xl border bg-card p-3">
          <p className={`font-display text-lg font-bold ${s.c}`}>{s.k}</p>
          <p className="text-[11px] text-muted-foreground">{s.v}</p>
        </div>
      ))}
      <div className="rounded-xl border bg-card p-4 sm:col-span-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Rent received (â‚¦M)</p>
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">+18% vs last year</span>
        </div>
        <div className="mt-4 flex h-28 gap-2">
          {RENT.map((r, i) => (
            <div key={r.m} className="flex flex-1 flex-col items-center justify-end gap-1.5">
              <div className={`w-full rounded-t-md ${i === RENT.length - 1 ? "bg-success" : "bg-primary/70"}`} style={{ height: `${r.v}%` }} />
              <span className="text-[10px] text-muted-foreground">{r.m}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2 rounded-xl border bg-card p-4">
        <p className="text-xs font-semibold">Upcoming</p>
        {[
          { t: "Lekki 3-bed renewal", d: "in 25 days", c: "bg-amber-500" },
          { t: "Wuse 2 inspection", d: "Thu, 10am", c: "bg-primary" },
          { t: "Generator service", d: "Approved", c: "bg-success" },
        ].map((x) => (
          <div key={x.t} className="flex items-center gap-2 text-[11px]">
            <span className={`size-1.5 rounded-full ${x.c}`} />
            <span className="flex-1 truncate">{x.t}</span>
            <span className="text-muted-foreground">{x.d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InspectionReportMock() {
  return (
    <div className="bg-subtle p-4 text-left sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Inspection report Â· Q3 2026</p>
          <p className="text-sm font-semibold">Serene 3-Bedroom Apartment, Lekki</p>
        </div>
        <Badge variant="success">
          <CircleCheck /> Good condition
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[EXTERIORS[0], INTERIORS[0], INTERIORS[6]].map((src, i) => (
          <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-lg">
            <SafeImage src={src} alt="" fill sizes="160px" />
            {i === 0 && (
              <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                <Video className="size-2.5" /> 2:41
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5 rounded-xl border bg-card p-3">
        {[
          ["Structure & roof", "Good"],
          ["Plumbing & borehole", "Good"],
          ["Electrical & meter", "Minor fix"],
          ["Tenant compliance", "Good"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{k}</span>
            <span className={v === "Good" ? "font-medium text-emerald-600" : "font-medium text-amber-600"}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaintenanceMock() {
  return (
    <div className="space-y-2 bg-subtle p-4 text-left sm:p-5">
      <p className="text-xs font-semibold">Maintenance requests</p>
      {[
        { t: "Replace kitchen tap", u: "Wuse 2 Â· Flat 3B", q: "â‚¦45,000", s: "Awaiting approval", c: "warning" as const },
        { t: "Generator servicing", u: "GRA PH Â· Main House", q: "â‚¦120,000", s: "In progress", c: "info" as const },
        { t: "Repaint exterior gate", u: "Old GRA Â· Flat 1", q: "â‚¦80,000", s: "Completed", c: "success" as const },
      ].map((m) => (
        <div key={m.t} className="flex items-center gap-3 rounded-xl border bg-card p-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <Hammer className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{m.t}</p>
            <p className="text-[10px] text-muted-foreground">
              {m.u} Â· {m.q}
            </p>
          </div>
          <Badge variant={m.c} className="text-[10px]">
            {m.s}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export default function DiasporaPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-brand-900 text-white">
        <div className="bg-grid absolute inset-0 -z-10 opacity-[0.07] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="absolute -right-32 top-0 -z-10 size-[480px] rounded-full bg-primary/50 blur-3xl" />
        <div className="absolute -bottom-40 left-0 -z-10 size-[400px] rounded-full bg-success/25 blur-3xl" />
        <div className="container-page grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <FadeIn>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/90">
                <Globe className="size-3.5 text-emerald-300" /> For Nigerians in the UK, US, Canada, Europe &amp; beyond
              </span>
            </FadeIn>
            <FadeIn delay={0.05}>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Manage Your Nigerian Property From Anywhere In The World
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="mt-5 max-w-xl text-lg text-white/75">
                No more unreliable caretakers or family favours. We inspect, verify, let and look after your property, and you see everything in real time.
              </p>
            </FadeIn>
            <FadeIn delay={0.15} className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="success">
                <Link href="/signup?role=landlord">
                  Get started <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link href="/contact">Book a video call</Link>
              </Button>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/70">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-300" /> Escrow-protected rent
                </span>
                <span className="flex items-center gap-2">
                  <Camera className="size-4 text-emerald-300" /> Photo &amp; video reports
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="size-4 text-emerald-300" /> GMT/EST-friendly support
                </span>
              </div>
            </FadeIn>
          </div>
          <FadeIn delay={0.15} className="relative">
            <BrowserFrame url="app.renton.ng/landlord" className="text-foreground">
              <RentDashboardMock />
            </BrowserFrame>
            <div className="absolute -bottom-8 -left-4 hidden w-64 rounded-2xl border bg-card p-4 text-foreground shadow-2xl sm:block">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-success/15 text-emerald-600">
                  <Wallet className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold">Rent received</p>
                  <p className="text-[11px] text-muted-foreground">Flat 3B, Wuse 2 Â· just now</p>
                </div>
              </div>
              <p className="mt-2 font-display text-xl font-bold">â‚¦8,500,000</p>
              <p className="text-[11px] text-muted-foreground">â‰ˆ Â£4,150 Â· settled to your UK account</p>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="container-page py-16 sm:py-24">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Full-service management</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Your eyes and hands on the ground</h2>
        </FadeIn>
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <StaggerItem key={f.title} className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
              <div className={`flex size-12 items-center justify-center rounded-xl ${f.tone}`}>
                <f.icon className="size-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="border-y bg-subtle py-16 sm:py-24">
        <div className="container-page space-y-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <FadeIn>
              <Badge variant="info">
                <ClipboardCheck /> Inspections
              </Badge>
              <h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">See your property without getting on a plane</h3>
              <p className="mt-3 text-muted-foreground">
                Field officers visit on schedule and file a structured report covering structure, plumbing, electrics and tenant compliance, with geo-tagged photos and a video walkthrough.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {["Quarterly or on-demand visits", "Timestamped, geo-tagged media", "Issue flags with repair quotes"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CircleCheck className="size-4 text-success" /> {t}
                  </li>
                ))}
              </ul>
            </FadeIn>
            <FadeIn delay={0.1}>
              <BrowserFrame url="app.renton.ng/landlord/inspections/q3">
                <InspectionReportMock />
              </BrowserFrame>
            </FadeIn>
          </div>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <FadeIn delay={0.1} className="lg:order-2">
              <Badge variant="warning">
                <Wrench /> Maintenance
              </Badge>
              <h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Approve repairs with one tap</h3>
              <p className="mt-3 text-muted-foreground">
                Tenants report issues in-app. We get quotes from vetted artisans, you approve from your phone, and we send before-and-after proof once it&apos;s done.
              </p>
            </FadeIn>
            <FadeIn className="lg:order-1">
              <BrowserFrame url="app.renton.ng/landlord/maintenance">
                <MaintenanceMock />
              </BrowserFrame>
            </FadeIn>
          </div>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <FadeIn>
              <Badge variant="success">
                <BadgeCheck /> Verification
              </Badge>
              <h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Protect your property from fraudsters</h3>
              <p className="mt-3 text-muted-foreground">
                Fraudsters often re-list diaspora-owned homes. Verifying your title with us locks your listing to you. Any duplicate is flagged and taken down.
              </p>
            </FadeIn>
            <FadeIn delay={0.1} className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-lift)]">
              <p className="mb-6 text-sm font-semibold">Brand-New 2-Bedroom Apartment, Chevron</p>
              <VerificationFlow stage="under_review" variant="vertical" />
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="container-page py-16 sm:py-24">
        <FadeIn className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-14 text-center text-white sm:px-12">
          <div className="absolute -left-20 -top-20 size-64 rounded-full bg-success/30 blur-3xl" />
          <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">Your property, handled.</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-white/80">Join 1,200+ diaspora landlords who manage their Nigerian properties with renton.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="white">
              <Link href="/signup?role=landlord">
                List your property <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="/contact">Talk to our team</Link>
            </Button>
          </div>
        </FadeIn>
      </section>
    </>
  );
}


