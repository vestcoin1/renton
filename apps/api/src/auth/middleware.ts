import type { Prisma, PrismaClient, UserRole } from "@prisma/client";
import { createMiddleware } from "hono/factory";
import type { AuthClaims } from "./verifier.js";
import type { AppEnv } from "../context.js";
import { ApiError } from "../lib/errors.js";

const currentUserInclude = { identity: { select: { status: true } } } satisfies Prisma.ProfileInclude;
export type CurrentUser = Prisma.ProfileGetPayload<{ include: typeof currentUserInclude }>;

/** Reads the bearer token, if any. An invalid or expired token is a 401 even on public routes. */
export const authenticate = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  c.set("auth", token ? await c.get("deps").auth.verify(token.trim()) : null);
  await next();
});

export function findProfile(db: PrismaClient, auth: AuthClaims) {
  if (auth.devProfileId) return db.profile.findUnique({ where: { id: auth.devProfileId }, include: currentUserInclude });
  return db.profile.findUnique({ where: { authUserId: auth.authUserId! }, include: currentUserInclude });
}

/**
 * Requires a signed-in user with a renton profile (and one of `roles`, if given).
 * A valid Supabase session without a profile gets 403 `profile_required`: the client should call POST /v1/me.
 */
export function requireUser(...roles: UserRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const auth = c.get("auth");
    if (!auth) throw ApiError.unauthorized();
    const profile = await findProfile(c.get("deps").db, auth);
    if (!profile) throw new ApiError(403, "profile_required", "Finish creating your account to continue.");
    if (profile.status === "suspended") throw new ApiError(403, "account_suspended", "This account has been suspended. Contact support@renton.ng.");
    if (roles.length && !roles.includes(profile.role)) throw ApiError.forbidden();
    c.set("user", profile);
    await next();
  });
}

/** Seeded accounts predate KYC submissions and fall back to the `identityVerified` flag (as in renton-core/identity). */
export function identityState(user: Pick<CurrentUser, "identity" | "identityVerified">) {
  return user.identity?.status ?? (user.identityVerified ? "verified" : "unverified");
}

/** Tenants can apply and landlords can list once documents are submitted; approval isn't a blocker. */
export function assertIdentitySubmitted(user: CurrentUser) {
  const s = identityState(user);
  if (s !== "pending" && s !== "verified") {
    throw new ApiError(403, "identity_required", "Submit your identity documents first.", { verifyPath: `/${user.role}/verify` });
  }
}
