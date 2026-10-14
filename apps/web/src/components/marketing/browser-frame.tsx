import { cn } from "renton-core/utils";

export function BrowserFrame({ url = "app.renton.ng", children, className }: { url?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-brand-900/15", className)}>
      <div className="flex items-center gap-2 border-b bg-muted/60 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-rose-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 flex-1 truncate rounded-md bg-background px-3 py-1 text-[11px] text-muted-foreground">{url}</span>
      </div>
      <div aria-hidden className="pointer-events-none select-none">
        {children}
      </div>
    </div>
  );
}


