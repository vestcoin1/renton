"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Loader2, ShieldCheck, UserRound } from "lucide-react";
import type { UserRole } from "@/types";
import { useHydration, useStore } from "renton-core/store";
import { useDemoAccount } from "renton-core/hooks";
import { DEMO_PASSWORD, postAuthPath, signIn } from "renton-core/auth";
import { AuthLayout } from "renton-ui/auth/auth-layout";
import { PasswordInput } from "renton-ui/auth/password-input";
import { Button } from "renton-ui/ui/button";
import { Input } from "renton-ui/ui/input";
import { Label } from "renton-ui/ui/label";
import { sleep } from "renton-core/utils";
import { useZoneRouter } from "renton-ui/zone-link";

const DEMOS: { role: UserRole; icon: typeof UserRound; title: string }[] = [
  { role: "tenant", icon: UserRound, title: "Tenant" },
  { role: "landlord", icon: Building2, title: "Landlord" },
  { role: "admin", icon: ShieldCheck, title: "Verification Team" },
];

function LoginForm() {
  const params = useSearchParams();
  // Admins sign in here too, then load the separately deployed admin zone.
  const router = useZoneRouter();
  const hydrated = useHydration((s) => s.hydrated);
  const role = useStore((s) => s.role);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const demoEmails = { tenant: useDemoAccount("tenant").email, landlord: useDemoAccount("landlord").email, admin: useDemoAccount("admin").email };
  const next = params.get("next");

  // Already signed in: skip the form.
  useEffect(() => {
    if (hydrated && role && !loading) router.replace(postAuthPath(role, next));
  }, [hydrated, role, loading, next, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    const [res] = await Promise.all([signIn(email, password), sleep(500)]);
    if (!res.ok) {
      setError(res.error);
      setLoading(false);
      return;
    }
    router.push(postAuthPath(res.role, next));
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          {loading ? "Signing inâ€¦" : "Sign in"}
          {!loading && <ArrowRight />}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New to renton?{" "}
          <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </form>

      <div className="mt-8 rounded-xl border border-dashed p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Try a demo account</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {DEMOS.map((d) => (
            <button
              key={d.role}
              type="button"
              onClick={() => {
                setEmail(demoEmails[d.role]);
                setPassword(DEMO_PASSWORD);
                setError(undefined);
              }}
              className="flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <d.icon className="size-4 text-primary" />
              {d.title}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Fills in the email and the demo password (<span className="font-mono">{DEMO_PASSWORD}</span>).
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back" description="Sign in to your renton account.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}


