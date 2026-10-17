import { SignJWT } from "jose";
import { createApp } from "../src/app.js";
import { signDevToken } from "../src/auth/verifier.js";
import type { AppDeps } from "../src/context.js";
import { createDeps } from "../src/deps.js";
import { loadEnv } from "../src/env.js";
import { prisma } from "../src/lib/prisma.js";

export { prisma };

export const env = loadEnv();

/**
 * Business clock for tests: starts at 2026-10-07 09:00 UTC (the day after the mock data's anchor date)
 * and advances in real time, so seeded notice periods and refund waits evaluate the same on any day.
 */
const CLOCK_START = Date.UTC(2026, 9, 7, 9);
const realStart = Date.now();
export const testNow = () => new Date(CLOCK_START + (Date.now() - realStart));
export const DAY = 86_400_000;

export function makeApp(overrides: Partial<AppDeps> = {}) {
  return createApp(createDeps(env, prisma, { now: testNow, ...overrides }));
}

/** Error envelope from a response, typed loosely for assertions. */
export async function errorOf(res: Response) {
  return ((await res.json()) as { error: { code: string; message: string; details?: any; requestId?: string } }).error;
}

/** Supabase-style access token signed with the test project's legacy HS256 secret. */
export function supabaseToken(sub: string, email: string, opts: { expiresIn?: string; secret?: string } = {}) {
  return new SignJWT({ email, role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? "1h")
    .sign(new TextEncoder().encode(opts.secret ?? env.SUPABASE_JWT_SECRET!));
}

type App = ReturnType<typeof makeApp>;
type Json = Record<string, any>;

/**
 * Tiny request helper: `const api = client(app); await api.as("u-tenant-1").post("/v1/…", body)`.
 * Returns status + parsed JSON so tests read like the workflow they exercise.
 */
export function client(app: App) {
  const tokens = new Map<string, string>();
  const call = (token: string | null) => {
    const send = async (method: string, path: string, payload?: unknown) => {
      const res = await app.request(path, {
        method,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(payload !== undefined ? { "Content-Type": "application/json" } : {}) },
        body: payload !== undefined ? JSON.stringify(payload) : undefined,
      });
      const text = await res.text();
      return { status: res.status, body: (text ? JSON.parse(text) : {}) as Json };
    };
    return {
      get: (path: string) => send("GET", path),
      post: (path: string, payload: unknown = {}) => send("POST", path, payload),
      put: (path: string, payload: unknown = {}) => send("PUT", path, payload),
      patch: (path: string, payload: unknown) => send("PATCH", path, payload),
      delete: (path: string) => send("DELETE", path),
    };
  };
  return {
    anon: call(null),
    withToken: (token: string) => call(token),
    as(profileId: string) {
      return {
        ...Object.fromEntries(
          (["get", "post", "put", "patch", "delete"] as const).map((m) => [
            m,
            async (path: string, payload?: unknown) => {
              if (!tokens.has(profileId)) tokens.set(profileId, await signDevToken(env, profileId));
              return (call(tokens.get(profileId)!) as any)[m](path, payload);
            },
          ]),
        ),
      } as ReturnType<typeof call>;
    },
  };
}

/** Latest notification in a profile's inbox. */
export const inbox = (profileId: string) =>
  prisma.notification.findMany({ where: { profileId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });

export const TENANT = "u-tenant-1";
export const LANDLORD = "u-landlord-1";
export const ADMIN = "u-admin-1";
