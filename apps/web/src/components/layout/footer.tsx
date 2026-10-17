import Link from "next/link";
import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { Logo } from "renton-ui/shared/logo";

const COLUMNS = [
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/diaspora", label: "Diaspora Services" },
    ],
  },
  {
    title: "Tenants",
    links: [
      { href: "/properties", label: "Find a Home" },
      { href: "/waiting-list", label: "Join Waiting List" },
      { href: "/login?next=/tenant", label: "Tenant Portal" },
    ],
  },
  {
    title: "Landlords",
    links: [
      { href: "/become-a-landlord", label: "Become a Landlord" },
      { href: "/signup?role=landlord", label: "List a Property" },
      { href: "/login?next=/landlord", label: "Landlord Portal" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Enugu", "Uyo", "Benin City"];

export function Footer() {
  return (
    <footer className="border-t bg-subtle">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Homes owned by Nigerians abroad, verified and managed on the ground by renton. No landlord wahala.
            </p>
            <div className="mt-5 space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" /> 12 Admiralty Way, Lekki Phase 1, Lagos
              </p>
              <p className="flex items-center gap-2">
                <Phone className="size-4 text-primary" /> +234 700 466 3347
              </p>
              <p className="flex items-center gap-2">
                <Mail className="size-4 text-primary" /> hello@renton.ng
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-semibold">{col.title}</h3>
                <ul className="mt-3 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-2 border-t pt-6">
          <span className="mr-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Cities</span>
          {CITIES.map((c) => (
            <Link
              key={c}
              href={`/properties?city=${encodeURIComponent(c)}`}
              className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {c}
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Â© {new Date().getFullYear()} renton Technologies Ltd. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-success" /> Never pay inspection fees outside renton.
          </p>
        </div>
      </div>
    </footer>
  );
}


