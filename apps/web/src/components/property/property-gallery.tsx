"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Grid2x2 } from "lucide-react";
import { SafeImage } from "renton-ui/shared/safe-image";
import { Dialog, DialogContent, DialogTitle } from "renton-ui/ui/dialog";
import { Button } from "renton-ui/ui/button";
import { cn } from "renton-core/utils";

export function PropertyGallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const show = (i: number) => {
    setIndex(i);
    setOpen(true);
  };
  const step = useCallback((d: number) => setIndex((i) => (i + d + images.length) % images.length), [images.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  return (
    <>
      <div className="relative grid h-[280px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:h-[420px] lg:h-[480px]">
        {images.slice(0, 5).map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => show(i)}
            className={cn(
              "group relative overflow-hidden bg-muted",
              i === 0 ? "col-span-4 row-span-2 sm:col-span-2" : "hidden sm:block",
            )}
            aria-label={`Open photo ${i + 1} of ${images.length}`}
          >
            <SafeImage
              src={src}
              alt={i === 0 ? title : `${title} â€” photo ${i + 1}`}
              fill
              priority={i === 0}
              sizes={i === 0 ? "(max-width: 640px) 100vw, 50vw" : "25vw"}
              className="transition-transform duration-700 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
          </button>
        ))}
        <Button variant="white" size="sm" className="absolute bottom-4 right-4 shadow-lg" onClick={() => show(0)}>
          <Grid2x2 /> Show all {images.length} photos
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl gap-0 border-0 bg-black p-0 text-white sm:rounded-2xl [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white">
          <DialogTitle className="sr-only">{title} photos</DialogTitle>
          <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/10]">
            <AnimatePresence mode="wait">
              <motion.div key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0">
                <SafeImage src={images[index]} alt={`${title} â€” photo ${index + 1}`} fill sizes="90vw" className="object-contain" />
              </motion.div>
            </AnimatePresence>
            <button onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-colors hover:bg-white/25">
              <ChevronLeft className="size-5" />
            </button>
            <button onClick={() => step(1)} aria-label="Next photo" className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-colors hover:bg-white/25">
              <ChevronRight className="size-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto p-3 scrollbar-none">
            {images.map((src, i) => (
              <button
                key={src + i}
                onClick={() => setIndex(i)}
                aria-label={`Photo ${i + 1}`}
                className={cn("relative h-14 w-20 shrink-0 overflow-hidden rounded-md transition-opacity", i === index ? "ring-2 ring-white" : "opacity-50 hover:opacity-100")}
              >
                <SafeImage src={src} alt="" fill sizes="80px" />
              </button>
            ))}
            <span className="ml-auto shrink-0 pl-3 text-xs text-white/70">
              {index + 1} / {images.length}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


