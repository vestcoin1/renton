"use client";

import { ZoneLink as Link } from "../zone-link";
import { Bell, BellOff, CalendarCheck, CalendarClock, CreditCard, FileText, MessageSquare, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import type { Notification } from "renton-shared/types";
import { useHydration, useStore } from "renton-core/store";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { cn, timeAgo } from "renton-core/utils";

const KIND_ICON: Record<Notification["kind"], { icon: typeof Bell; className: string }> = {
  application: { icon: FileText, className: "bg-primary/10 text-primary" },
  verification: { icon: ShieldCheck, className: "bg-success/10 text-emerald-600 dark:text-emerald-400" },
  match: { icon: Sparkles, className: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  message: { icon: MessageSquare, className: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  payment: { icon: CreditCard, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  system: { icon: CalendarCheck, className: "bg-muted text-muted-foreground" },
  maintenance: { icon: Wrench, className: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  lease: { icon: CalendarClock, className: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
};

const NONE: Notification[] = [];

export function NotificationBell() {
  const hydrated = useHydration((s) => s.hydrated);
  const items = useStore((s) => (s.userId ? s.notifications[s.userId] : undefined) ?? NONE);
  const markAllRead = useStore((s) => s.markAllRead);
  const markRead = useStore((s) => s.markRead);
  const unread = hydrated ? items.filter((n) => !n.read).length : 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-background">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold">Notifications</p>
          {unread > 0 && (
            <button className="text-xs font-medium text-primary hover:underline" onClick={() => markAllRead()}>
              Mark all as read
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center text-sm text-muted-foreground">
            <BellOff className="mb-2 size-6" /> You&apos;re all caught up
          </div>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {items.map((n) => {
              const meta = KIND_ICON[n.kind];
              const content = (
                <div className={cn("flex gap-3 px-4 py-3 transition-colors hover:bg-muted/60", !n.read && "bg-primary/[0.03]")}>
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", meta.className)}>
                    <meta.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                </div>
              );
              return (
                <li key={n.id} onClick={() => markRead(n.id)}>
                  {n.href ? <Link href={n.href}>{content}</Link> : content}
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}


