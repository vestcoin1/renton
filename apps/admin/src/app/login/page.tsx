"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { useHydration, useStore } from "renton-core/store";
import { useDemoAccount } from "renton-core/hooks";
import { DEMO_PASSWORD, postAuthPath, signIn } from "renton-core/auth";
import { AuthLayout } from "renton-ui/auth/auth-layout";
import { PasswordInput } from "renton-ui/auth/password-input";
import { useZoneRouter } from "renton-ui/zone-link";
import { Button } from "renton-ui/ui/button";
import { Input } from "renton-ui/ui/input";
import { Label } from "renton-ui/ui/label";
import { sleep } from "renton-core/utils";

/** Admin-only sign-in, so the portal also works when opened on its own domain. */
function AdminLoginForm() {
  const params = useSearchParams();
  const router = useZoneRouter();
  const hydrated = useHydration((s) => s.hydrated);
  const role = useStore((s) => s.role);
  const logout = useStore((s) => s.logout);
  const demoEmail = useDemoAccount("admin").email;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const next = params.get("next");

  useEffect(() => {
    if (hydrated && role === "admin" && !loading) router.replace(postAuthPath("admin", next));
  }, [hydrated, role, loading, next, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    const [res] = await Promise.all([signIn(email, password), sleep(500)]);
    if (res.ok && res.role !== "admin") {
      // Valid tenant/landlord credentials don't open the admin portal.
      logout();
      setError("This portal is for the renton verification team. Tenants and landlords sign in on the main site.");
    } else if (!res.ok) setError(res.error);
    else return router.push(postAuthPath("admin", next));
    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@renton.ng" />
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
      <button
        type="button"
        onClick={() => {
          setEmail(demoEmail);
          setPassword(DEMO_PASSWORD);
          setError(undefined);
        }}
        className="w-full rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        Use the demo admin account ({demoEmail} / <span className="font-mono">{DEMO_PASSWORD}</span>)
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <AuthLayout title="renton Admin" description="Sign in to the verification team portal.">
      <Suspense>
        <AdminLoginForm />
      </Suspense>
    </AuthLayout>
  );
}


