"use client";

import { ZoneLink as Link } from "../zone-link";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { cn, initials } from "renton-core/utils";

const TONES = {
  blue: "bg-primary/10 text-primary",
  emerald: "bg-success/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  slate: "bg-muted text-muted-foreground",
} as const;

export type Tone = keyof typeof TONES;

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: Tone;
  delta?: { value: string; positive?: boolean };
  hint?: string;
  href?: string;
  index?: number;
}

export function StatCard({ label, value, icon: Icon, tone = "blue", delta, hint, href, index = 0 }: StatCardProps) {
  const body = (
    <Card className={cn("group relative h-full overflow-hidden p-5 transition-all duration-300", href && "hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]")}>
      <div className="flex items-start justify-between">
        <div className={cn("flex size-10 items-center justify-center rounded-xl", TONES[tone])}>
          <Icon className="size-5" />
        </div>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
              delta.positive ? "bg-success/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
          >
            {delta.positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {delta.value}
          </span>
        )}
      </div>
      <p className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.4 }}>
      {href ? (
        <Link href={href} className="block h-full rounded-2xl">
          {body}
        </Link>
      ) : (
        body
      )}
    </motion.div>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="p-5">
      <Skeleton className="size-10 rounded-xl" />
      <Skeleton className="mt-4 h-8 w-20" />
      <Skeleton className="mt-2 h-4 w-28" />
    </Card>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-sm font-medium text-primary">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function UserAvatar({ name, hue = 210, className }: { name: string; hue?: number; className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarFallback
        className="font-semibold"
        style={{ backgroundColor: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 60% 28%)` }}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Lightweight dependency-free bar chart for dashboard widgets. */
export function MiniBarChart({ data, className, format }: { data: { label: string; value: number }[]; className?: string; format?: (n: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("flex h-40 gap-2", className)} role="img" aria-label="Bar chart">
      {data.map((d, i) => (
        <div key={d.label} className="group flex flex-1 flex-col items-center gap-2">
          <div className="relative flex w-full flex-1 items-end">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.value / max) * 100}%` }}
              transition={{ delay: i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={cn("w-full rounded-t-md bg-primary/80 transition-colors group-hover:bg-primary", i === data.length - 1 && "bg-success/90 group-hover:bg-success")}
            />
            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
              {format ? format(d.value) : d.value}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}


