"use client";

import { ShieldCheck } from "lucide-react";
import { Logo } from "../shared/logo";
import { ThemeToggle } from "../shared/theme-toggle";
import { SafeImage } from "../shared/safe-image";
import { HERO_IMAGE } from "renton-core/assets";

/** Split-screen frame shared by the sign-in and sign-up pages. */
export function AuthLayout({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-6 sm:px-12">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden lg:block">
        <SafeImage src={HERO_IMAGE} alt="" fill priority sizes="50vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-900/40 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <ShieldCheck className="size-8 text-emerald-300" />
          <p className="mt-4 text-2xl font-semibold leading-snug">&ldquo;Every home on renton has been inspected in person. That&apos;s why I trust it.&rdquo;</p>
          <p className="mt-3 text-sm text-white/75">Chiamaka Eze, tenant in Lekki</p>
        </div>
      </div>
    </div>
  );
}


