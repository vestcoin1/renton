"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "./ui/tooltip";
import { STORE_KEY, useHydration, useStore } from "renton-core/store";

function StoreHydrator() {
  const setHydrated = useHydration((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        await useStore.persist.rehydrate();
      } catch (error) {
        console.warn("renton demo: failed to rehydrate persisted state", error);
      } finally {
        if (!cancelled) setHydrated();
      }
    };

    void refresh();

    const intervalId = window.setInterval(() => {
      void useStore.persist.rehydrate();
    }, 3000);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORE_KEY || event.key === null) {
        void useStore.persist.rehydrate();
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("storage", onStorage);
    };
  }, [setHydrated]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>
        <StoreHydrator />
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "!rounded-xl !border-border !bg-card !text-card-foreground !shadow-lg",
              description: "!text-muted-foreground",
            },
          }}
        />
      </TooltipProvider>
    </ThemeProvider>
  );
}


