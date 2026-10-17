import { createRemoteJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify, SignJWT, type JWTVerifyGetKey } from "jose";
import type { Env } from "../env.js";
import { ApiError } from "../lib/errors.js";

/** Who a bearer token says the caller is. Exactly one of `authUserId` / `devProfileId` is set. */
export interface AuthClaims {
  /** Supabase auth.users.id (the JWT `sub`). */
  authUserId: string | null;
  email: string | null;
  /** Set only for development tokens minted by POST /v1/dev/session. */
  devProfileId: string | null;
}

export interface AuthVerifier {
  verify(token: string): Promise<AuthClaims>;
}

const AUDIENCE = "authenticated";
const DEV_ISSUER = "renton-dev";
const encode = (secret: string) => new TextEncoder().encode(secret);

/**
 * Verifies Supabase access tokens:
 * - asymmetric (ES256/RS256) tokens against the project's JWKS — the current Supabase default;
 * - HS256 tokens against the legacy JWT secret, if configured;
 * - HS256 development tokens (issuer "renton-dev"), only when DEV_AUTH is on.
 */
export function createAuthVerifier(env: Env, opts: { jwks?: JWTVerifyGetKey } = {}): AuthVerifier {
  const base = env.SUPABASE_URL?.replace(/\/$/, "");
  const jwks = opts.jwks ?? (base ? createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`)) : null);
  const issuer = base ? `${base}/auth/v1` : undefined;
  const legacySecret = env.SUPABASE_JWT_SECRET ? encode(env.SUPABASE_JWT_SECRET) : null;
  const devSecret = env.DEV_AUTH && env.DEV_AUTH_SECRET ? encode(env.DEV_AUTH_SECRET) : null;

  const supabaseClaims = (payload: { sub?: string; email?: unknown }): AuthClaims => {
    if (!payload.sub) throw new Error("missing sub");
    return { authUserId: payload.sub, email: typeof payload.email === "string" ? payload.email.toLowerCase() : null, devProfileId: null };
  };

  return {
    async verify(token) {
      try {
        const { alg } = decodeProtectedHeader(token);
        if (alg === "HS256") {
          if (decodeJwt(token).iss === DEV_ISSUER) {
            if (!devSecret) throw new Error("dev tokens disabled");
            const { payload } = await jwtVerify(token, devSecret, { issuer: DEV_ISSUER, audience: AUDIENCE, algorithms: ["HS256"] });
            if (!payload.sub) throw new Error("missing sub");
            return { authUserId: null, email: null, devProfileId: payload.sub };
          }
          if (!legacySecret) throw new Error("HS256 not configured");
          const { payload } = await jwtVerify(token, legacySecret, { audience: AUDIENCE, algorithms: ["HS256"], ...(issuer ? { issuer } : {}) });
          return supabaseClaims(payload);
        }
        if (!jwks) throw new Error("JWKS not configured");
        const { payload } = await jwtVerify(token, jwks, { audience: AUDIENCE, ...(issuer ? { issuer } : {}) });
        return supabaseClaims(payload);
      } catch {
        throw ApiError.unauthorized("Your session is invalid or has expired. Sign in again.");
      }
    },
  };
}

/** Mints a development token for a profile. Only callable when DEV_AUTH is on. */
export async function signDevToken(env: Env, profileId: string, ttl = "12h") {
  if (!env.DEV_AUTH || !env.DEV_AUTH_SECRET) throw new Error("DEV_AUTH is disabled");
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(profileId)
    .setIssuer(DEV_ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(encode(env.DEV_AUTH_SECRET));
}
