"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  ClipboardList,
  CloudUpload,
  ImagePlus,
  Loader2,
  MapPin,
  Sparkles,
  Star,
  Wallet,
  X,
  Images,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import type { PropertyType } from "@/types";
import { useStore } from "renton-core/store";
import { AMENITIES, PROPERTY_TYPES, STATES, areasFor, citiesFor } from "renton-shared/reference";
import { galleryFor } from "renton-core/assets";
import { PageHeader } from "renton-ui/dashboard/widgets";
import { VerificationFlow } from "renton-ui/shared/verification-flow";
import { amenityIcon } from "@/components/property/amenity-icon";
import { Button } from "renton-ui/ui/button";
import { Card } from "renton-ui/ui/card";
import { Checkbox } from "renton-ui/ui/checkbox";
import { Input } from "renton-ui/ui/input";
import { Label } from "renton-ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "renton-ui/ui/select";
import { Textarea } from "renton-ui/ui/textarea";
import { cn, formatNaira, sleep } from "renton-core/utils";
import { GatePrompt, useIdentityGate } from "@/components/identity/identity-gate";

const STEPS = [
  { title: "Basic Information", icon: FileText },
  { title: "Location", icon: MapPin },
  { title: "Pricing", icon: Wallet },
  { title: "Amenities", icon: Sparkles },
  { title: "Photos", icon: Images },
  { title: "Review & Submit", icon: ClipboardList },
];

interface Photo {
  id: string;
  url: string;
  name: string;
}

interface FormState {
  title: string;
  type: PropertyType | "";
  description: string;
  bedrooms: string;
  bathrooms: string;
  state: string;
  city: string;
  area: string;
  address: string;
  rent: string;
  serviceCharge: string;
  amenities: string[];
  photos: Photo[];
  confirm: boolean;
}

const INITIAL: FormState = {
  title: "",
  type: "",
  description: "",
  bedrooms: "3",
  bathrooms: "3",
  state: "",
  city: "",
  area: "",
  address: "",
  rent: "",
  serviceCharge: "",
  amenities: ["24/7 Security", "Borehole", "Prepaid Meter", "Parking"],
  photos: [],
  confirm: false,
};

const digits = (s: string) => Number(s.replace(/\D/g, "") || 0);
const money = (s: string) => {
  const n = digits(s);
  return n ? n.toLocaleString("en-NG") : "";
};

function Field({ label, error, children, hint, htmlFor }: { label: string; error?: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function PhotoDropzone({ photos, onChange }: { photos: Photo[]; onChange: (p: Photo[]) => void }) {
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!imgs.length) {
        toast.error("Please upload image files (JPG, PNG or WebP)");
        return;
      }
      setUploading(imgs.length);
      await sleep(900); // simulated upload to storage bucket
      onChange([...photos, ...imgs.map((f) => ({ id: crypto.randomUUID(), url: URL.createObjectURL(f), name: f.name }))]);
      setUploading(0);
    },
    [photos, onChange]
  );

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all",
          drag ? "scale-[1.01] border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"
        )}
      >
        <motion.span animate={{ y: drag ? -4 : 0 }} className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {uploading ? <Loader2 className="size-6 animate-spin" /> : <CloudUpload className="size-6" />}
        </motion.span>
        <p className="mt-4 font-semibold">{uploading ? `Uploading ${uploading} photo${uploading > 1 ? "s" : ""}â€¦` : drag ? "Drop to upload" : "Drag & drop photos here"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          or <span className="font-medium text-primary">browse files</span> Â· JPG, PNG, WebP up to 10MB
        </p>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground">
          {photos.length} photo{photos.length !== 1 && "s"} added Â· at least 3 required
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...photos, ...galleryFor(Math.floor(Math.random() * 16)).map((url, i) => ({ id: crypto.randomUUID(), url, name: `sample-${i + 1}.jpg` }))])}
        >
          <ImagePlus /> Use sample photos
        </Button>
      </div>
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AnimatePresence>
            {photos.map((p, i) => (
              <motion.li key={p.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="group relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob previews */}
                <img src={p.url} alt={p.name} className="size-full object-cover" />
                {i === 0 ? (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                    <Star className="size-3" /> Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onChange([p, ...photos.filter((x) => x.id !== p.id)])}
                    className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    Make cover
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => onChange(photos.filter((x) => x.id !== p.id))}
                  className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

/** Landlords must submit identity documents before listing (ownership is then checked per property). */
export default function AddPropertyPage() {
  const block = useIdentityGate("landlord");
  if (!block) return <AddPropertyWizard />;
  return (
    <>
      <PageHeader title="Add a property" description="Takes about 5 minutes. Your listing goes live after verification." />
      <Card className="p-6">
        <GatePrompt block={block} role="landlord" />
      </Card>
    </>
  );
}

function AddPropertyWizard() {
  const addProperty = useStore((s) => s.addProperty);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [f, setF] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (f.title.trim().length < 8) e.title = "Give your listing a descriptive title (min. 8 characters).";
      if (!f.type) e.type = "Select a property type.";
      if (f.description.trim().length < 40) e.description = "Describe the property in at least 40 characters.";
    }
    if (s === 1) {
      if (!f.state) e.state = "Select a state.";
      if (!f.city) e.city = "Select a city.";
      if (!f.area) e.area = "Select an area.";
      if (f.address.trim().length < 5) e.address = "Enter the street address.";
    }
    if (s === 2) {
      if (digits(f.rent) < 100_000) e.rent = "Annual rent must be at least â‚¦100,000.";
    }
    if (s === 4 && f.photos.length < 3) e.photos = "Add at least 3 photos.";
    if (s === 5 && !f.confirm) e.confirm = "Please confirm you own or are authorised to let this property.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate(step)) return;
    setDir(1);
    setStep((s) => s + 1);
  };
  const back = () => {
    setDir(-1);
    setStep((s) => s - 1);
  };

  const submit = async () => {
    if (!validate(5)) return;
    setSubmitting(true);
    await sleep(1200);
    const rent = digits(f.rent);
    addProperty({
      title: f.title.trim(),
      type: f.type as PropertyType,
      description: f.description.trim(),
      state: f.state,
      city: f.city,
      area: f.area,
      address: f.address.trim(),
      rent,
      serviceCharge: digits(f.serviceCharge),
      cautionDeposit: Math.round(rent * 0.1),
      bedrooms: Number(f.bedrooms),
      bathrooms: Number(f.bathrooms),
      toilets: Number(f.bathrooms) + 1,
      sizeSqm: 40 + Number(f.bedrooms) * 40,
      furnished: f.amenities.includes("Air Conditioning"),
      parkingSpaces: f.amenities.includes("Parking") ? 2 : 0,
      waterSupply: "Borehole",
      power: f.amenities.includes("Inverter Backup") ? "Prepaid + Inverter" : "Prepaid Meter",
      security: f.amenities.includes("24/7 Security"),
      amenities: f.amenities,
      // Blob previews don't survive reloads; persist remote URLs (Supabase Storage in production).
      images: f.photos.filter((p) => !p.url.startsWith("blob:")).map((p) => p.url).concat(galleryFor(f.title.length)).slice(0, 5),
      availableFrom: new Date().toISOString(),
    });
    setSubmitting(false);
    setDone(true);
    toast.success("Property submitted for verification");
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl py-10 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 240, damping: 15 }} className="mx-auto flex size-20 items-center justify-center rounded-full bg-success/15">
          <CircleCheck className="size-11 text-success" />
        </motion.div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Submitted for verification</h1>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          <span className="font-medium text-foreground">{f.title}</span> is now in our verification queue. We&apos;ll contact you within 48 hours to schedule a physical inspection.
        </p>
        <Card className="mt-8 p-6">
          <VerificationFlow stage="submitted" />
        </Card>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/landlord/properties">Go to my properties</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setF(INITIAL);
              setStep(0);
              setDone(false);
            }}
          >
            Add another property
          </Button>
        </div>
      </div>
    );
  }

  const cities = citiesFor(f.state);
  const areas = areasFor(f.city);
  const total = digits(f.rent) + digits(f.serviceCharge);

  return (
    <>
      <PageHeader title="Add a property" description="Takes about 5 minutes. Your listing goes live after verification." />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Wizard steps" className="lg:sticky lg:top-24 lg:self-start">
          <ol className="flex gap-2 overflow-x-auto pb-2 scrollbar-none lg:flex-col lg:gap-1 lg:pb-0">
            {STEPS.map((s, i) => {
              const state = i < step ? "done" : i === step ? "current" : "todo";
              return (
                <li key={s.title} className="shrink-0">
                  <button
                    type="button"
                    disabled={i > step}
                    onClick={() => {
                      setDir(i < step ? -1 : 1);
                      setStep(i);
                    }}
                    aria-current={state === "current" ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      state === "current" && "bg-primary/10 font-semibold text-primary",
                      state === "done" && "hover:bg-muted",
                      state === "todo" && "text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                        state === "done" && "border-success bg-success text-white",
                        state === "current" && "border-primary text-primary",
                        state === "todo" && "border-border"
                      )}
                    >
                      {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="whitespace-nowrap">{s.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <Card className="overflow-hidden">
          <div className="border-b px-6 py-4">
            <p className="text-xs font-medium text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="text-lg font-semibold">{STEPS[step].title}</h2>
          </div>
          <div className="min-h-[380px] p-6">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} initial={{ opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -24 }} transition={{ duration: 0.22 }}>
                {step === 0 && (
                  <div className="grid gap-5">
                    <Field label="Property title" htmlFor="title" error={errors.title} hint="e.g. Spacious 3-Bedroom Apartment with Pool">
                      <Input id="title" value={f.title} onChange={(e) => set("title", e.target.value)} aria-invalid={!!errors.title} />
                    </Field>
                    <div className="grid gap-5 sm:grid-cols-3">
                      <Field label="Property type" error={errors.type}>
                        <Select value={f.type} onValueChange={(v) => set("type", v as PropertyType)}>
                          <SelectTrigger aria-label="Property type" aria-invalid={!!errors.type}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROPERTY_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Bedrooms" htmlFor="beds">
                        <Input id="beds" type="number" min={1} max={10} value={f.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} />
                      </Field>
                      <Field label="Bathrooms" htmlFor="baths">
                        <Input id="baths" type="number" min={1} max={10} value={f.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} />
                      </Field>
                    </div>
                    <Field label="Description" htmlFor="desc" error={errors.description} hint={`${f.description.length}/1000 characters`}>
                      <Textarea
                        id="desc"
                        rows={6}
                        maxLength={1000}
                        value={f.description}
                        onChange={(e) => set("description", e.target.value)}
                        placeholder="Describe the layout, finishing, neighbourhood and what makes this home special."
                        aria-invalid={!!errors.description}
                      />
                    </Field>
                  </div>
                )}

                {step === 1 && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="State" error={errors.state}>
                      <Select
                        value={f.state}
                        onValueChange={(v) => {
                          const c = citiesFor(v);
                          setF((p) => ({ ...p, state: v, city: c.length === 1 ? c[0] : "", area: "" }));
                          setErrors({});
                        }}
                      >
                        <SelectTrigger aria-label="State" aria-invalid={!!errors.state}>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="City" error={errors.city}>
                      <Select
                        value={f.city}
                        onValueChange={(v) => {
                          set("city", v);
                          set("area", "");
                        }}
                        disabled={!f.state}
                      >
                        <SelectTrigger aria-label="City" aria-invalid={!!errors.city}>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Area" error={errors.area}>
                      <Select value={f.area} onValueChange={(v) => set("area", v)} disabled={!f.city}>
                        <SelectTrigger aria-label="Area" aria-invalid={!!errors.area}>
                          <SelectValue placeholder="Select area" />
                        </SelectTrigger>
                        <SelectContent>
                          {areas.map((a) => (
                            <SelectItem key={a} value={a}>
                              {a}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Street address" htmlFor="address" error={errors.address} hint="Only shown to approved applicants.">
                      <Input id="address" value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="e.g. 14 Admiralty Road" aria-invalid={!!errors.address} />
                    </Field>
                    <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm sm:col-span-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                      A renton field officer will confirm the GPS location during inspection. Listings with mismatched addresses are rejected.
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Annual rent (â‚¦)" htmlFor="rent" error={errors.rent}>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">â‚¦</span>
                        <Input id="rent" inputMode="numeric" className="pl-7" value={money(f.rent)} onChange={(e) => set("rent", e.target.value)} placeholder="4,500,000" aria-invalid={!!errors.rent} />
                      </div>
                    </Field>
                    <Field label="Annual service charge (â‚¦)" htmlFor="sc" hint="Covers estate security, cleaning, shared power, etc.">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">â‚¦</span>
                        <Input id="sc" inputMode="numeric" className="pl-7" value={money(f.serviceCharge)} onChange={(e) => set("serviceCharge", e.target.value)} placeholder="500,000" />
                      </div>
                    </Field>
                    <div className="rounded-2xl border bg-subtle p-5 sm:col-span-2">
                      <p className="text-sm font-semibold">What tenants will see</p>
                      <dl className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Annual rent</dt>
                          <dd>{formatNaira(digits(f.rent))}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Service charge</dt>
                          <dd>{formatNaira(digits(f.serviceCharge))}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Caution deposit (10%)</dt>
                          <dd>{formatNaira(Math.round(digits(f.rent) * 0.1))}</dd>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-semibold">
                          <dt>Tenant pays upfront</dt>
                          <dd>{formatNaira(total + Math.round(digits(f.rent) * 0.1))}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <p className="mb-4 text-sm text-muted-foreground">Select everything that applies. Our inspector will confirm these on site.</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {AMENITIES.map((a) => {
                        const Icon = amenityIcon(a);
                        const on = f.amenities.includes(a);
                        return (
                          <Label
                            key={a}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-xl border p-3 font-normal transition-all",
                              on ? "border-primary/50 bg-primary/5" : "hover:border-primary/30"
                            )}
                          >
                            <Checkbox checked={on} onCheckedChange={(c) => set("amenities", c ? [...f.amenities, a] : f.amenities.filter((x) => x !== a))} />
                            <Icon className={cn("size-4", on ? "text-primary" : "text-muted-foreground")} />
                            {a}
                          </Label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div>
                    <PhotoDropzone photos={f.photos} onChange={(p) => set("photos", p)} />
                    {errors.photos && <p className="mt-3 text-sm text-destructive">{errors.photos}</p>}
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
                      <div className="aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
                        {f.photos[0] && (
                          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                          <img src={f.photos[0].url} alt="Cover" className="size-full object-cover" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-primary">{f.type}</p>
                        <p className="text-lg font-semibold">{f.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {f.address}, {f.area}, {f.city}, {f.state}
                        </p>
                        <p className="mt-2 font-display text-xl font-bold">
                          {formatNaira(digits(f.rent))} <span className="text-sm font-normal text-muted-foreground">/year</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {f.bedrooms} bed Â· {f.bathrooms} bath Â· {f.photos.length} photos Â· {f.amenities.length} amenities
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl border p-4">
                      <p className="text-sm font-semibold">Description</p>
                      <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{f.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {f.amenities.map((a) => (
                        <span key={a} className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs">
                          {a}
                        </span>
                      ))}
                    </div>
                    <div className="rounded-2xl border bg-subtle p-5">
                      <p className="mb-4 text-sm font-semibold">What happens next</p>
                      <VerificationFlow stage="draft" />
                    </div>
                    <Label className="flex cursor-pointer items-start gap-3 font-normal">
                      <Checkbox checked={f.confirm} onCheckedChange={(c) => set("confirm", !!c)} className="mt-0.5" aria-invalid={!!errors.confirm} />
                      <span className="text-sm leading-relaxed">
                        I confirm I am the legal owner of this property or hold a valid power of attorney, and that the information provided is accurate. I agree to a physical inspection by renton.
                      </span>
                    </Label>
                    {errors.confirm && <p className="text-sm text-destructive">{errors.confirm}</p>}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-between border-t bg-subtle px-6 py-4">
            <Button variant="ghost" onClick={back} disabled={step === 0 || submitting}>
              <ArrowLeft /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>
                Continue <ArrowRight />
              </Button>
            ) : (
              <Button variant="success" onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : <Check />} {submitting ? "Submittingâ€¦" : "Submit for verification"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}


