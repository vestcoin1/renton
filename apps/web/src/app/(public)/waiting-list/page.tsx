import type { Metadata } from "next";
import { Suspense } from "react";
import { BellRing, ShieldCheck, Sparkles } from "lucide-react";
import { WaitlistOnboarding } from "@/components/waitlist/waitlist-onboarding";
import { Skeleton } from "renton-ui/ui/skeleton";

export const metadata: Metadata = {
  title: "Join the waiting list",
  description: "Tell us your ideal area, budget and home type. We'll match you with verified homes, often before they're publicly listed.",
};

export default function WaitingListPage() {
  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-brand-50 to-transparent dark:from-brand-900/30" />
      <div className="container-page grid gap-10 py-10 sm:py-14 lg:grid-cols-[340px_1fr] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Smart waiting list</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Let the right home find you</h1>
          <p className="mt-3 text-muted-foreground">Answer four quick questions. We&apos;ll score every verified home against your needs and alert you to new matches first.</p>
          <ul className="mt-8 space-y-5">
            {[
              { icon: Sparkles, t: "Match score on every home", d: "See exactly why a home fits, from area and budget to availability." },
              { icon: BellRing, t: "First to know", d: "Get alerts before listings go public." },
              { icon: ShieldCheck, t: "Only verified homes", d: "Every match has passed our 6-stage verification." },
            ].map((f) => (
              <li key={f.t} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-sm ring-1 ring-border">
                  <f.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{f.t}</p>
                  <p className="text-sm text-muted-foreground">{f.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-lift)] sm:p-8 lg:p-10">
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
            <WaitlistOnboarding embedded />
          </Suspense>
        </div>
      </div>
    </div>
  );
}


