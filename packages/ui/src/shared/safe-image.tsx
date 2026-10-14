"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { House } from "lucide-react";
import { cn } from "renton-core/utils";

/** next/image with a branded fallback if the remote photo fails to load. */
export function SafeImage({ className, alt, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn("absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-900 dark:to-slate-900", className)}
      >
        <House className="size-10 text-brand-500/40" />
      </div>
    );
  }

  return (
    <Image
      alt={alt}
      className={cn("object-cover transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0", className)}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      {...props}
    />
  );
}


