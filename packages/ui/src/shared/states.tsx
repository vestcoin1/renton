"use client";

import { ZoneLink as Link } from "../zone-link";
import { motion } from "framer-motion";
import { CircleAlert, Inbox, RefreshCw, type LucideIcon } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "renton-core/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed bg-subtle px-6 py-14 text-center", className)}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 scale-150 rounded-full bg-primary/5 blur-xl" />
        <div className="relative flex size-14 items-center justify-center rounded-2xl border bg-card shadow-sm">
          <Icon className="size-6 text-primary" />
        </div>
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action &&
        (action.href ? (
          <Button asChild className="mt-5">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button className="mt-5" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </motion.div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Check your connection and try again.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-14 text-center", className)}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
        <CircleAlert className="size-6 text-destructive" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RefreshCw /> Try again
        </Button>
      )}
    </div>
  );
}


