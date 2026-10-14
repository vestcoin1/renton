"use client";

/**
 * Email + password auth against the client mock DB. Supabase Auth replaces this module:
 * `signUp` â†’ `supabase.auth.signUp` + insert into `profiles`, `signIn` â†’ `signInWithPassword`.
 * Passwords are salted and hashed even in the demo so plain text never reaches localStorage.
 */
import type { UserRole } from "renton-shared/types";
import { useStore } from "./store";

export const MIN_PASSWORD = 8;
/** Password for the seeded demo accounts (listed on the login page). */
export const DEMO_PASSWORD = "demo1234";

export async function hashPassword(password: string, salt: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${password}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export interface SignUpInput {
  role: Exclude<UserRole, "admin">;
  name: string;
  email: string;
  phone: string;
  city: string;
  password: string;
}

type Result = { ok: true; role: UserRole } | { ok: false; error: string };

export async function signUp(input: SignUpInput): Promise<Result> {
  const email = normalizeEmail(input.email);
  if (input.name.trim().length < 2) return { ok: false, error: "Enter your full name." };
  if (!isValidEmail(email)) return { ok: false, error: "Enter a valid email address." };
  if (input.password.length < MIN_PASSWORD) return { ok: false, error: `Password must be at least ${MIN_PASSWORD} characters.` };
  if (useStore.getState().credentials[email]) return { ok: false, error: "An account with this email already exists. Sign in instead." };

  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(input.password, salt);
  useStore.getState().registerAccount({ ...input, name: input.name.trim(), email, phone: input.phone.trim(), salt, passwordHash });
  return { ok: true, role: input.role };
}

export async function signIn(emailInput: string, password: string): Promise<Result> {
  const email = normalizeEmail(emailInput);
  const { credentials, users, login } = useStore.getState();
  const cred = credentials[email];
  // Same message for unknown email and wrong password so accounts can't be enumerated.
  const invalid = { ok: false as const, error: "Incorrect email or password." };
  if (!cred) return invalid;
  if ((await hashPassword(password, cred.salt)) !== cred.passwordHash) return invalid;
  const user = users.find((u) => u.id === cred.userId);
  if (!user) return invalid;
  if (user.status === "suspended") return { ok: false, error: "This account has been suspended. Contact supportrenton.ng." };
  login(user.id);
  return { ok: true, role: user.role };
}

const PORTALS: UserRole[] = ["tenant", "landlord", "admin"];

/** Where to land after auth: the `next` param if it's a local path this role may open, else the role's home. */
export function postAuthPath(role: UserRole, next: string | null) {
  const home = `/${role}`;
  // Only same-origin relative paths: blocks open redirects like "//evil.com" or "https://â€¦".
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return home;
  const portal = PORTALS.find((p) => next === `/${p}` || next.startsWith(`/${p}/`));
  return portal && portal !== role ? home : next;
}


