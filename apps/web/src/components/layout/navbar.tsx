"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Menu, Plus } from "lucide-react";
import { Logo } from "renton-ui/shared/logo";
import { ThemeToggle } from "renton-ui/shared/theme-toggle";
import { Button } from "renton-ui/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "renton-ui/ui/sheet";
import { useHydration, useStore } from "renton-core/store";
import { ROLE_HOME, UserMenu } from "renton-ui/layout/user-menu";
import { NotificationBell } from "renton-ui/layout/notification-bell";
import { cn } from "renton-core/utils";
import { ZoneLink } from "renton-ui/zone-link";

const LINKS = [
  { href: "/properties", label: "Find Homes" },
  { href: "/waiting-list", label: "Waiting List" },
  { href: "/become-a-landlord", label: "For Landlords" },
  { href: "/diaspora", label: "Diaspora" },
];

export function Navbar() {
  const pathname = usePathname();
  const hydrated = useHydration((s) => s.hydrated);
  const role = useStore((s) => s.role);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const signedIn = hydrated && role;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-all duration-300",
        scrolled ? "border-border bg-background/85 shadow-sm backdrop-blur-xl" : "border-transparent bg-background/60 backdrop-blur-md"
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <nav className="container-page flex h-16 items-center justify-between gap-4" aria-label="Main">
        <Logo />
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={cn(
                    "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {l.label}
                  {active && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-primary" />}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {signedIn ? (
            <>
              <NotificationBell />
              <Button asChild size="sm" variant="outline" className="hidden lg:inline-flex">
                <ZoneLink href={ROLE_HOME[role]}>
                  <LayoutDashboard /> Dashboard
                </ZoneLink>
              </Button>
              <UserMenu compact />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link href="/signup">Sign up</Link>
              </Button>
              <Button asChild size="sm" className="hidden lg:inline-flex">
                <Link href="/signup?role=landlord">
                  <Plus /> List property
                </Link>
              </Button>
            </>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="border-b p-5">
                <Logo />
              </div>
              <ul className="space-y-1 p-3">
                {LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={cn(
                        "block rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors hover:bg-accent",
                        pathname.startsWith(l.href) && "bg-accent text-primary"
                      )}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-auto space-y-2 border-t p-4">
                {signedIn ? (
                  <Button asChild className="w-full">
                    <ZoneLink href={ROLE_HOME[role]}>Go to dashboard</ZoneLink>
                  </Button>
                ) : (
                  <>
                    <Button asChild className="w-full">
                      <Link href="/signup?role=landlord">List your property</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/signup">Create an account</Link>
                    </Button>
                    <Button asChild variant="ghost" className="w-full">
                      <Link href="/login">Sign in</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}


