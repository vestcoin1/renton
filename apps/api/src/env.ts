import { z } from "zod";

/** Treats "" (an unset line in .env) as missing. */
const optional = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

/** Validated once at startup so a missing or malformed variable fails fast with a readable message. */
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),
    DATABASE_URL: z.string().url(),
    CORS_ORIGINS: z
      .string()
      .default("")
      .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean)),
    /** Largest request body accepted, in MB (receipts and photos can be inlined as data URLs in development). */
    BODY_LIMIT_MB: z.coerce.number().positive().default(15),

    /** Project URL, e.g. https://abcd.supabase.co. Enables JWKS token verification and Storage. */
    SUPABASE_URL: optional(z.string().url()),
    /** Legacy HS256 JWT secret, for projects that haven't moved to asymmetric signing keys. */
    SUPABASE_JWT_SECRET: optional(z.string().min(32)),
    /** Server-only key for Storage signed URLs and the setup script. Never sent to clients. */
    SUPABASE_SERVICE_ROLE_KEY: optional(z.string().min(20)),

    /** Development sign-in without Supabase (POST /v1/dev/session). Refused in production. */
    DEV_AUTH: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    DEV_AUTH_SECRET: optional(z.string().min(32)),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && env.DEV_AUTH) {
      ctx.addIssue({ code: "custom", path: ["DEV_AUTH"], message: "must be false in production" });
    }
    if (env.NODE_ENV === "production" && !env.SUPABASE_URL && !env.SUPABASE_JWT_SECRET) {
      ctx.addIssue({ code: "custom", path: ["SUPABASE_URL"], message: "SUPABASE_URL or SUPABASE_JWT_SECRET is required in production" });
    }
    if (env.DEV_AUTH && !env.DEV_AUTH_SECRET) {
      ctx.addIssue({ code: "custom", path: ["DEV_AUTH_SECRET"], message: "is required when DEV_AUTH=true (at least 32 characters)" });
    }
    if (env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_URL) {
      ctx.addIssue({ code: "custom", path: ["SUPABASE_URL"], message: "is required when SUPABASE_SERVICE_ROLE_KEY is set" });
    }
  });

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${issues}\nSee apps/api/.env.example.`);
  }
  return parsed.data;
}
