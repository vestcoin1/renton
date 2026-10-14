"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useHydration, useStore } from "renton-core/store";
import { cn } from "renton-core/utils";
import { Button } from "renton-ui/ui/button";

export function SaveButton({ propertyId, variant = "overlay", className }: { propertyId: string; variant?: "overlay" | "button"; className?: string }) {
  const hydrated = useHydration((s) => s.hydrated);
  const saved = useStore((s) => s.savedIds.includes(propertyId)) && hydrated;
  const toggle = useStore((s) => s.toggleSaved);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowSaved = toggle(propertyId);
    toast.success(nowSaved ? "Saved to your shortlist" : "Removed from saved", {
      description: nowSaved ? "Find it anytime under Saved Properties." : undefined,
    });
  };

  const heart = (
    <motion.span key={String(saved)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
      <Heart className={cn("size-[18px] transition-colors", saved ? "fill-rose-500 text-rose-500" : "")} />
    </motion.span>
  );

  if (variant === "button") {
    return (
      <Button variant="outline" onClick={onClick} aria-pressed={saved} className={className}>
        {heart}
        {saved ? "Saved" : "Save"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save property"}
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm backdrop-blur transition-transform hover:scale-110 dark:bg-slate-900/90 dark:text-slate-200",
        className
      )}
    >
      {heart}
    </button>
  );
}


