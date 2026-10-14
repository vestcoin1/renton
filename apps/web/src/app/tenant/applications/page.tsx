"use client";

import Link from "next/link";
import { PAYMENT_STATUS } from "renton-ui/payments/payment-parts";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Circle, Clock, FileText, MapPin, MessageSquareQuote, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Application, ApplicationStatus, Property } from "@/types";
import { useTenantData } from "renton-core/hooks";
import { useStore } from "renton-core/store";
import { PageHeader } from "renton-ui/dashboard/widgets";
import { SafeImage } from "renton-ui/shared/safe-image";
import { EmptyState } from "renton-ui/shared/states";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card } from "renton-ui/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "renton-ui/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "renton-ui/ui/tabs";
import { APPLICATION_META } from "renton-core/status";
import { cn, formatDate, formatNaira, timeAgo } from "renton-core/utils";

const TABS: { value: ApplicationStatus; icon: typeof Clock; empty: string }[] = [
  { value: "pending", icon: Clock, empty: "No applications awaiting a response." },
  { value: "approved", icon: CheckCircle2, empty: "Approved applications will appear here." },
  { value: "rejected", icon: XCircle, empty: "Nothing here, and that's a good thing." },
];

function Timeline({ app }: { app: Application }) {
  const steps = [
    { label: "Application submitted", at: app.submittedAt, done: true },
    { label: "Viewed by landlord", at: app.status !== "pending" ? app.submittedAt : undefined, done: app.status !== "pending" || Date.now() - +new Date(app.submittedAt) > 86400000 },
    {
      label: app.status === "rejected" ? "Application declined" : app.status === "approved" ? "Application approved" : "Awaiting decision",
      at: app.status !== "pending" ? app.updatedAt : undefined,
      done: app.status !== "pending",
      bad: app.status === "rejected",
    },
    { label: "Sign tenancy & move in", done: false },
  ];
  return (
    <ol className="space-y-3">
      {steps.map((s) => (
        <li key={s.label} className="flex items-center gap-3 text-sm">
          {s.done ? (
            s.bad ? <XCircle className="size-5 text-destructive" /> : <CheckCircle2 className="size-5 text-success" />
          ) : (
            <Circle className="size-5 text-muted-foreground/50" />
          )}
          <span className={cn("flex-1", !s.done && "text-muted-foreground")}>{s.label}</span>
          {s.at && <span className="text-xs text-muted-foreground">{formatDate(s.at)}</span>}
        </li>
      ))}
    </ol>
  );
}

function ApplicationDetails({ app, property, onClose }: { app: Application | null; property?: Property; onClose: () => void }) {
  const withdraw = useStore((s) => s.withdrawApplication);
  const invoice = useStore((s) => s.invoices.find((i) => i.id === app?.invoiceId));
  if (!app || !property) return null;
  const meta = APPLICATION_META[app.status];
  return (
    <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant={meta.variant}>{meta.label}</Badge>
            <span className="text-xs text-muted-foreground">#{app.id.toUpperCase()}</span>
          </div>
          <DialogTitle className="pt-1">{property.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            <MapPin className="size-3.5" /> {property.area}, {property.city} Â· {formatNaira(property.rent)}/yr
          </DialogDescription>
        </DialogHeader>
        <div className="relative aspect-[16/7] overflow-hidden rounded-xl">
          <SafeImage src={property.images[0]} alt={property.title} fill sizes="600px" />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Move-in date</p>
            <p className="font-medium">{formatDate(app.moveInDate)}</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Lease length</p>
            <p className="font-medium">
              {app.leaseYears} year{app.leaseYears > 1 && "s"}
            </p>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Progress</p>
          <Timeline app={app} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Your message</p>
          <p className="rounded-xl border bg-subtle p-3 text-sm text-muted-foreground">{app.message}</p>
        </div>
        {app.landlordNote && (
          <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <MessageSquareQuote className="size-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold text-primary">Landlord&apos;s note</p>
              <p className="text-sm">{app.landlordNote}</p>
            </div>
          </div>
        )}
        <div>
          <p className="mb-2 text-sm font-semibold">Documents shared</p>
          <div className="flex flex-wrap gap-2">
            {app.documents.map((d) => (
              <span key={d} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs">
                <FileText className="size-3.5 text-muted-foreground" /> {d}
              </span>
            ))}
          </div>
        </div>
        {invoice && (
          <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
            <div>
              <p className="text-xs text-muted-foreground">Move-in payment</p>
              <p className="font-semibold">{formatNaira(invoice.total)}</p>
            </div>
            <Badge variant={PAYMENT_STATUS[invoice.status].variant}>{PAYMENT_STATUS[invoice.status].tenantLabel}</Badge>
          </div>
        )}
        <DialogFooter>
          {invoice && (invoice.status === "awaiting_payment" || invoice.status === "rejected") && (
            <Button asChild variant="success">
              <Link href="/tenant/payments">Pay now</Link>
            </Button>
          )}
          {app.status === "pending" && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                withdraw(app.id);
                toast("Application withdrawn");
                onClose();
              }}
            >
              Withdraw
            </Button>
          )}
          <Button asChild>
            <Link href={`/properties/${property.id}`}>View property</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ApplicationsPage() {
  const { applications, byId, invoices } = useTenantData();
  const [selected, setSelected] = useState<Application | null>(null);

  return (
    <>
      <PageHeader title="Applications" description="Track every home you've applied for." />
      <Tabs defaultValue="pending">
        <TabsList className="w-full sm:w-auto">
          {TABS.map((t) => {
            const n = applications.filter((a) => a.status === t.value).length;
            return (
              <TabsTrigger key={t.value} value={t.value} className="flex-1 sm:flex-none">
                <t.icon className="size-4" /> {APPLICATION_META[t.value].label}
                <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">{n}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {TABS.map((t) => {
          const list = applications.filter((a) => a.status === t.value);
          return (
            <TabsContent key={t.value} value={t.value}>
              {list.length === 0 ? (
                <EmptyState icon={t.icon} title={`No ${t.value} applications`} description={t.empty} action={t.value === "pending" ? { label: "Find a home", href: "/properties" } : undefined} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence>
                    {list.map((a, i) => {
                      const p = byId.get(a.propertyId);
                      if (!p) return null;
                      const meta = APPLICATION_META[a.status];
                      return (
                        <motion.div key={a.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }} exit={{ opacity: 0, scale: 0.97 }}>
                          <Card className="group flex cursor-pointer overflow-hidden transition-all hover:shadow-[var(--shadow-lift)]" onClick={() => setSelected(a)}>
                            <div className="relative w-28 shrink-0 sm:w-36">
                              <SafeImage src={p.images[0]} alt="" fill sizes="150px" />
                            </div>
                            <div className="min-w-0 flex-1 p-4">
                              <div className="flex items-start justify-between gap-2">
                                <p className="line-clamp-1 font-semibold group-hover:text-primary">{p.title}</p>
                                <Badge variant={meta.variant}>{meta.label}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {p.area}, {p.city}
                              </p>
                              <p className="mt-2 text-sm font-semibold">{formatNaira(p.rent)}/yr</p>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3.5" /> Applied {timeAgo(a.submittedAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="size-3.5" /> Move-in {formatDate(a.moveInDate, { day: "numeric", month: "short" })}
                                </span>
                              </div>
                              {(() => {
                                const inv = invoices.find((i) => i.id === a.invoiceId);
                                if (!inv) return (
                                  <Button variant="link" size="sm" className="mt-1 h-auto px-0">
                                    View details
                                  </Button>
                                );
                                const due = inv.status === "awaiting_payment" || inv.status === "rejected";
                                return (
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <Badge variant={PAYMENT_STATUS[inv.status].variant}>{PAYMENT_STATUS[inv.status].tenantLabel}</Badge>
                                    {due && (
                                      <Button asChild size="sm" variant="success" className="h-7" onClick={(e) => e.stopPropagation()}>
                                        <Link href="/tenant/payments">Pay {formatNaira(inv.total)}</Link>
                                      </Button>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
      <ApplicationDetails app={selected} property={selected ? byId.get(selected.propertyId) : undefined} onClose={() => setSelected(null)} />
    </>
  );
}


