"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, ShieldCheck } from "lucide-react";
import type { MessageThread } from "@/types";
import { useMessageThreads } from "renton-core/hooks";
import { useStore } from "renton-core/store";
import { PageHeader, UserAvatar } from "renton-ui/dashboard/widgets";
import { Card } from "renton-ui/ui/card";
import { Input } from "renton-ui/ui/input";
import { Button } from "renton-ui/ui/button";
import { cn, timeAgo } from "renton-core/utils";

export default function MessagesPage() {
  const initialThreads = useMessageThreads();
  const properties = useStore((s) => s.properties);
  const [threads, setThreads] = useState<MessageThread[]>(initialThreads);
  const [activeId, setActiveId] = useState<string | null>(initialThreads[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const active = threads.find((t) => t.id === activeId);
  const property = properties.find((p) => p.id === active?.propertyId);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [active?.messages.length, activeId]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !active) return;
    const msg = { id: crypto.randomUUID(), fromMe: true, body: draft.trim(), at: new Date().toISOString() };
    setThreads((ts) => ts.map((t) => (t.id === active.id ? { ...t, messages: [...t.messages, msg], lastMessage: msg.body, updatedAt: msg.at } : t)));
    setDraft("");
    setTimeout(() => {
      const reply = { id: crypto.randomUUID(), fromMe: false, body: "Thanks for your message! I'll get back to you shortly.", at: new Date().toISOString() };
      setThreads((ts) => ts.map((t) => (t.id === active.id ? { ...t, messages: [...t.messages, reply], lastMessage: reply.body, updatedAt: reply.at } : t)));
    }, 1500);
  };

  return (
    <>
      <PageHeader title="Messages" description="Chat directly with verified landlords. Never share payment details in chat." />
      <Card className="grid h-[calc(100dvh-14rem)] min-h-[480px] overflow-hidden md:grid-cols-[320px_1fr]">
        <ul className={cn("divide-y overflow-y-auto border-r", mobileOpen && "hidden md:block")}>
          {threads.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => {
                  setActiveId(t.id);
                  setMobileOpen(true);
                  setThreads((ts) => ts.map((x) => (x.id === t.id ? { ...x, unread: 0 } : x)));
                }}
                className={cn("flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50", activeId === t.id && "bg-primary/5")}
              >
                <UserAvatar name={t.withName} hue={t.withRole === "admin" ? 160 : 210} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{t.withName}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(t.updatedAt)}</span>
                  </div>
                  <p className={cn("truncate text-xs", t.unread ? "font-medium text-foreground" : "text-muted-foreground")}>{t.lastMessage}</p>
                </div>
                {t.unread > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">{t.unread}</span>}
              </button>
            </li>
          ))}
        </ul>
        {active && (
          <div className={cn("flex min-h-0 flex-col", !mobileOpen && "hidden md:flex")}>
            <div className="flex items-center gap-3 border-b p-4">
              <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={() => setMobileOpen(false)} aria-label="Back to conversations">
                <ArrowLeft className="size-4" />
              </Button>
              <UserAvatar name={active.withName} hue={active.withRole === "admin" ? 160 : 210} className="size-9" />
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-sm font-semibold">
                  {active.withName} <ShieldCheck className="size-3.5 text-success" />
                </p>
                <p className="truncate text-xs text-muted-foreground">{property ? `Re: ${property.title}` : "renton support"}</p>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-subtle p-4" aria-live="polite">
              {active.messages.map((m) => (
                <div key={m.id} className={cn("flex", m.fromMe ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm", m.fromMe ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-card")}>
                    {m.body}
                    <p className={cn("mt-1 text-[10px]", m.fromMe ? "text-white/70" : "text-muted-foreground")}>{timeAgo(m.at)}</p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="flex gap-2 border-t p-3">
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a messageâ€¦" aria-label="Message" />
              <Button type="submit" size="icon" aria-label="Send" disabled={!draft.trim()}>
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        )}
      </Card>
    </>
  );
}


