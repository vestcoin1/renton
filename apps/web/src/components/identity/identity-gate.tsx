"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, ShieldCheck } from "lucide-react";
import { useHydration, useStore } from "renton-core/store";
import { useCurrentUser } from "renton-core/hooks";
import { hasSubmittedIdentity, verifyPath } from "renton-core/identity";
import { Button } from "renton-ui/ui/button";

type Role = "tenant" | "landlord";
export type GateBlock = "signin" | "verify" | null;

/** Why the visitor can't do a `role`-only action yet: not signed in as that role, or no identity documents submitted. */
export function useIdentityGate(role: Role): GateBlock {
  const hydrated = useHydration((s) => s.hydrated);
  const sessionRole = useStore((s) => s.role);
  const user = useCurrentUser();
  if (!hydrated) return null;
  if (sessionRole !== role || !user) return "signin";
  return hasSubmittedIdentity(user) ? null : "verify";
}

const ACTION = { tenant: "apply for homes", landlord: "list a property" };

/** Explains the block and links to sign-in/sign-up or the verification page. */
export function GatePrompt({ block, role, action = ACTION[role] }: { block: Exclude<GateBlock, null>; role: Role; action?: string }) {
  const pathname = usePathname();
  const next = encodeURIComponent(pathname);
  const Icon = block === "signin" ? LogIn : ShieldCheck;

  return (
    <div className="flex flex-col items-center py-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-7" />
      </span>
      <p className="mt-4 text-lg font-semibold">{block === "signin" ? `Sign in as a ${role} to ${action}` : "Verify your identity first"}</p>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {block === "signin"
          ? `You need a ${role} account to ${action}. It's free and takes a minute.`
          : `Upload your verification documents to ${action}. It takes about 3 minutes, and you can continue while we review them.`}
      </p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        {block === "signin" ? (
          <>
            <Button asChild>
              <Link href={`/signup?role=${role}&next=${next}`}>Create an account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/login?next=${next}`}>Sign in</Link>
            </Button>
          </>
        ) : (
          <Button asChild>
            <Link href={verifyPath(role)}>Verify my identity</Link>
          </Button>
        )}
      </div>
    </div>
  );
}


