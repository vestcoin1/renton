"use client";

import { useState } from "react";
import { BadgeCheck, Briefcase, CheckCircle2, Circle, Clock, IdCard, Loader2, Mail, Phone, ShieldCheck, Upload, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useTenantData } from "renton-core/hooks";
import { TenancyDocuments } from "@/components/payments/tenancy-documents";
import { PageHeader, UserAvatar } from "renton-ui/dashboard/widgets";
import { Badge } from "renton-ui/ui/badge";
import { Button } from "renton-ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "renton-ui/ui/card";
import { Input } from "renton-ui/ui/input";
import { Label } from "renton-ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "renton-ui/ui/select";
import { cn, formatDate, formatNaira, sleep } from "renton-core/utils";

const SECTIONS = [
  { label: "Personal information", weight: 20, done: true },
  { label: "Identity verified (NIN)", weight: 25, done: true },
  { label: "Employment details", weight: 20, done: true },
  { label: "Guarantor added", weight: 20, done: true },
  { label: "Previous landlord reference", weight: 15, done: false },
];

function CompletionRing({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-32">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} strokeWidth="10" className="fill-none stroke-muted" />
        <circle cx="60" cy="60" r={r} strokeWidth="10" strokeLinecap="round" className="fill-none stroke-success transition-all duration-1000" strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold">{value}%</span>
        <span className="text-[11px] text-muted-foreground">complete</span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { tenant: t, invoices } = useTenantData();
  const [sections, setSections] = useState(SECTIONS);
  const [saving, setSaving] = useState(false);
  const completion = sections.reduce((n, s) => n + (s.done ? s.weight : 0), 0);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await sleep(800);
    setSaving(false);
    toast.success("Profile updated");
  };

  return (
    <>
      <PageHeader title="Profile" description="Your rental profile is shared with landlords when you apply." />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-6">
          <Card className="p-6 text-center">
            <UserAvatar name={t.name} hue={t.avatarHue} className="mx-auto size-20 text-2xl" />
            <p className="mt-3 text-lg font-semibold">{t.name}</p>
            <p className="text-sm text-muted-foreground">
              {t.occupation} at {t.employer}
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Badge variant="success">
                <BadgeCheck /> ID verified
              </Badge>
              <Badge variant="secondary">Member since {formatDate(t.joinedAt, { month: "short", year: "numeric" })}</Badge>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile completion</CardTitle>
              <CardDescription>Complete profiles get approved 2Ã— faster.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <CompletionRing value={completion} />
              </div>
              <ul className="mt-5 space-y-2.5">
                {sections.map((s) => (
                  <li key={s.label} className="flex items-center gap-2.5 text-sm">
                    {s.done ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted-foreground" />}
                    <span className={cn("flex-1", !s.done && "text-muted-foreground")}>{s.label}</span>
                    {!s.done && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => {
                          setSections((prev) => prev.map((x) => (x.label === s.label ? { ...x, done: true } : x)));
                          toast.success("Reference request sent to previous landlord");
                        }}
                      >
                        Add
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-success" /> Verification status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: IdCard, l: "National ID (NIN)", s: "Verified", ok: true },
                { icon: Mail, l: "Email address", s: "Verified", ok: true },
                { icon: Phone, l: "Phone number", s: "Verified", ok: true },
                { icon: Briefcase, l: "Employment letter", s: "Verified", ok: true },
                { icon: UserRound, l: "Landlord reference", s: completion === 100 ? "Pending" : "Not started", ok: false },
              ].map((v) => (
                <div key={v.l} className="flex items-center gap-3 text-sm">
                  <v.icon className="size-4 text-muted-foreground" />
                  <span className="flex-1">{v.l}</span>
                  <Badge variant={v.ok ? "success" : "neutral"}>
                    {v.ok ? <BadgeCheck /> : <Clock />} {v.s}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
        <Card id="documents" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Tenancy documents</CardTitle>
            <CardDescription>Your signed tenancy agreements and renton payment receipts.</CardDescription>
          </CardHeader>
          <CardContent>
            <TenancyDocuments invoices={invoices} />
          </CardContent>
        </Card>
        <form onSubmit={save} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" defaultValue={t.name} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={t.email} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" defaultValue={t.phone} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">Current city</Label>
                <Input id="city" defaultValue={t.city} />
              </div>
              <div className="grid gap-2">
                <Label>Marital status</Label>
                <Select defaultValue={t.maritalStatus}>
                  <SelectTrigger aria-label="Marital status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="household">Household size</Label>
                <Input id="household" type="number" min={1} defaultValue={t.householdSize} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employment information</CardTitle>
              <CardDescription>Landlords see your income band, never your exact salary.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input id="occupation" defaultValue={t.occupation} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="employer">Employer</Label>
                <Input id="employer" defaultValue={t.employer} />
              </div>
              <div className="grid gap-2">
                <Label>Employment type</Label>
                <Select defaultValue={t.employmentType}>
                  <SelectTrigger aria-label="Employment type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Full-time", "Self-employed", "Contract", "Student"].map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="income">Monthly income</Label>
                <Input id="income" defaultValue={formatNaira(t.monthlyIncome)} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="guarantor">Guarantor</Label>
                <Input id="guarantor" defaultValue={t.guarantor} />
              </div>
              <div className="sm:col-span-2">
                <Label>Employment letter</Label>
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-dashed p-4 text-sm">
                  <Upload className="size-5 text-muted-foreground" />
                  <span className="flex-1">
                    Employment_letter_Paystack.pdf <span className="text-muted-foreground">Â· 412 KB</span>
                  </span>
                  <Badge variant="success">
                    <BadgeCheck /> Verified
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="reset" variant="outline">
              Discard
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Save changes
            </Button>
          </div>
        </form>
        </div>
      </div>
    </>
  );
}


