"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Check, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { CITIES } from "renton-shared/reference";
import { useHydration, useStore } from "renton-core/store";
import { MIN_PASSWORD, postAuthPath, signUp, type SignUpInput } from "renton-core/auth";
import { AuthLayout } from "renton-ui/auth/auth-layout";
import { PasswordInput } from "renton-ui/auth/password-input";
import { Button } from "renton-ui/ui/button";
import { Checkbox } from "renton-ui/ui/checkbox";
import { Input } from "renton-ui/ui/input";
import { Label } from "renton-ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "renton-ui/ui/select";
import { cn, sleep } from "renton-core/utils";

type Role = SignUpInput["role"];

const ROLES: { role: Role; icon: typeof UserRound; title: string; desc: string; verify: string }[] = [
  { role: "tenant", icon: UserRound, title: "I'm looking for a home", desc: "Rent verified homes directly from landlords", verify: "ID, selfie and proof of income" },
  { role: "landlord", icon: Building2, title: "I'm a landlord", desc: "List properties and find verified tenants", verify: "ID and proof of address" },
];

function SignupForm() {
  const params = useSearchParams();
  const router = useRouter();
  const hydrated = useHydration((s) => s.hydrated);
  const signedInRole = useStore((s) => s.role);
  const [role, setRole] = useState<Role>(params.get("role") === "landlord" ? "landlord" : "tenant");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Lagos");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const next = params.get("next");

  useEffect(() => {
    if (hydrated && signedInRole && !loading) router.replace(postAuthPath(signedInRole, next));
  }, [hydrated, signedInRole, loading, next, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terms) return setError("Please accept the terms to continue.");
    setError(undefined);
    setLoading(true);
    const [res] = await Promise.all([signUp({ role, name, email, phone, city, password }), sleep(700)]);
    if (!res.ok) {
      setError(res.error);
      setLoading(false);
      return;
    }
    toast.success("Welcome to renton!", { description: "Next, verify your identity to unlock everything." });
    // A tenant who signed up mid-application goes back to that home; everyone else lands on their dashboard.
    router.push(next ? postAuthPath(role, next) : `/${role}`);
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <fieldset>
        <legend className="mb-3 text-sm font-medium">I want to</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLES.map((r) => {
            const on = role === r.role;
            return (
              <button
                key={r.role}
                type="button"
                aria-pressed={on}
                onClick={() => setRole(r.role)}
                className={cn("relative flex flex-col gap-2 rounded-xl border p-3.5 text-left transition-all", on ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/40")}
              >
                <span className={cn("flex size-9 items-center justify-center rounded-lg", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  <r.icon className="size-[18px]" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{r.title}</span>
                  <span className="block text-xs text-muted-foreground">{r.desc}</span>
                </span>
                {on && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="As it appears on your ID" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="city">{role === "tenant" ? "City you're looking in" : "City your properties are in"}</Label>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger id="city">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CITIES.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" autoComplete="new-password" required minLength={MIN_PASSWORD} value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD} characters.</p>
      </div>

      <Label className="flex items-start gap-3 font-normal">
        <Checkbox checked={terms} onCheckedChange={(c) => setTerms(c === true)} className="mt-0.5" />
        <span className="text-sm text-muted-foreground">
          I agree to the{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </span>
      </Label>

      <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        Next, you&apos;ll verify your identity from your dashboard. Have your {ROLES.find((r) => r.role === role)!.verify} ready.
      </p>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        {loading ? "Creating accountâ€¦" : "Create account"}
        {!loading && <ArrowRight />}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <AuthLayout title="Create your account" description="Join renton as a tenant or a landlord.">
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthLayout>
  );
}


