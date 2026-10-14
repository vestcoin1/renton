"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "renton-ui/shared/states";
import { Button } from "renton-ui/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <ErrorState description="An unexpected error occurred while loading this page. Our team has been notified." onRetry={reset} />
        <div className="mt-4 text-center">
          <Button asChild variant="link">
            <Link href="/">Return to homepage</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}


