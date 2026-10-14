import { ShieldCheck } from "lucide-react";
import { Button } from "renton-ui/ui/button";
import { LogoMark } from "renton-ui/shared/logo";
import { ZoneLink } from "renton-ui/zone-link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark className="size-12" />
      <p className="mt-8 font-display text-7xl font-extrabold tracking-tight text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">This admin page doesn&apos;t exist</h1>
      <Button asChild size="lg" className="mt-8">
        <ZoneLink href="/admin">
          <ShieldCheck /> Back to the admin overview
        </ZoneLink>
      </Button>
    </div>
  );
}


