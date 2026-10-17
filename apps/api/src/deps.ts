import type { PrismaClient } from "@prisma/client";
import { createAuthVerifier } from "./auth/verifier.js";
import type { AppDeps } from "./context.js";
import type { Env } from "./env.js";
import { createLogger } from "./lib/logger.js";
import { supabaseStorage } from "./lib/storage.js";

export function createDeps(env: Env, db: PrismaClient, overrides: Partial<AppDeps> = {}): AppDeps {
  return {
    env,
    db,
    logger: createLogger(env.LOG_LEVEL),
    auth: createAuthVerifier(env),
    storage: env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY ? supabaseStorage(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY) : null,
    now: () => new Date(),
    ...overrides,
  };
}
