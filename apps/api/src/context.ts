import type { PrismaClient } from "@prisma/client";
import type { AuthClaims, AuthVerifier } from "./auth/verifier.js";
import type { Env } from "./env.js";
import type { Logger } from "./lib/logger.js";
import type { Storage } from "./lib/storage.js";
import type { CurrentUser } from "./auth/middleware.js";

/** Everything a request handler needs, injected once so tests can swap pieces. */
export interface AppDeps {
  env: Env;
  db: PrismaClient;
  logger: Logger;
  auth: AuthVerifier;
  /** Null when Supabase Storage isn't configured (local development accepts inline data URLs). */
  storage: Storage | null;
  /** Business clock. Every time-based rule (notice periods, refund waits, due dates) reads this. */
  now: () => Date;
}

export type AppEnv = {
  Variables: {
    requestId: string;
    deps: AppDeps;
    auth: AuthClaims | null;
    user: CurrentUser;
  };
};
