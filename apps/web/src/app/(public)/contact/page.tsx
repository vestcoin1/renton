"use client";

import { useState } from "react";
import { Loader2, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "renton-ui/ui/button";
import { Card } from "renton-ui/ui/card";
import { Input } from "renton-ui/ui/input";
import { Label } from "renton-ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "renton-ui/ui/select";
import { Textarea } from "renton-ui/ui/textarea";
import { sleep } from "renton-core/utils";

export default function ContactPage() {
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSending(true);
    await sleep(900);
    setSending(false);
    form.reset();
    toast.success("Message sent", { description: "Our team will get back to you within one business hour." });
  };

  return (
    <div className="container-page grid gap-10 py-14 sm:py-20 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Contact</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">We&apos;re here to help</h1>
        <p className="mt-3 text-muted-foreground">Questions about a listing, verification or diaspora management? Reach us any way you like.</p>
        <div className="mt-8 space-y-3">
          {[
            { icon: Phone, t: "Call us", d: "+234 700 466 3347 Â· Monâ€“Sat, 8amâ€“8pm WAT" },
            { icon: MessageCircle, t: "WhatsApp", d: "+234 812 000 4663" },
            { icon: Mail, t: "Email", d: "hellorenton.ng" },
            { icon: MapPin, t: "Visit", d: "12 Admiralty Way, Lekki Phase 1, Lagos" },
          ].map((c) => (
            <div key={c.t} className="flex items-center gap-4 rounded-xl border bg-card p-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <c.icon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{c.t}</p>
                <p className="text-sm text-muted-foreground">{c.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Card className="p-6 sm:p-8">
        <form onSubmit={submit} className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required autoComplete="name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>I am aâ€¦</Label>
            <Select defaultValue="tenant">
              <SelectTrigger aria-label="I am a">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">Tenant / renter</SelectItem>
                <SelectItem value="landlord">Landlord in Nigeria</SelectItem>
                <SelectItem value="diaspora">Diaspora landlord</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" required rows={5} />
          </div>
          <Button type="submit" size="lg" disabled={sending}>
            {sending ? <Loader2 className="animate-spin" /> : <Send />} {sending ? "Sendingâ€¦" : "Send message"}
          </Button>
        </form>
      </Card>
    </div>
  );
}


