import Link from "next/link";
import { Search, House } from "lucide-react";
import { Button } from "renton-ui/ui/button";
import { LogoMark } from "renton-ui/shared/logo";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <LogoMark className="size-12" />
      <p className="mt-8 font-display text-7xl font-extrabold tracking-tight text-primary sm:text-8xl">404</p>
      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">This address doesn&apos;t exist</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        The page you&apos;re looking for may have been moved, or the listing was taken down after it was let.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/properties">
            <Search /> Browse verified homes
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">
            <House /> Back home
          </Link>
        </Button>
      </div>
    </div>
  );
}


