import { Hono } from "hono";
import { DEMO_ACCOUNTS } from "renton-core/mock/users";
import { z } from "zod";
import { signDevToken } from "../auth/verifier.js";
import type { AppEnv } from "../context.js";
import { ApiError } from "../lib/errors.js";
import { body } from "../lib/validate.js";
import { profileInclude, toUser } from "../mappers.js";
import { createProfile } from "../services/accounts.js";

/**
 * Development-only sign-in, mounted only when DEV_AUTH=true (refused in production).
 * Lets the apps run against a local database without a Supabase project; there are no passwords.
 */
export const dev = new Hono<AppEnv>()
  .post("/session", async (c) => {
    const { db, env } = c.get("deps");
    const input = await body(
      c,
      z.union([z.object({ role: z.enum(["tenant", "landlord", "admin"]) }), z.object({ profileId: z.string() }), z.object({ email: z.string() })]),
    );
    const where =
      "role" in input ? { id: DEMO_ACCOUNTS[input.role].id } : "profileId" in input ? { id: input.profileId } : { email: input.email.trim().toLowerCase() };
    const row = await db.profile.findUnique({ where, include: profileInclude });
    if (!row) throw ApiError.notFound("Account");
    return c.json({ token: await signDevToken(env, row.id), user: toUser(row, { withDocuments: true }) });
  })

  .post("/signup", async (c) => {
    const { db, env, now } = c.get("deps");
    const input = await body(
      c,
      z.object({
        role: z.enum(["tenant", "landlord"]),
        name: z.string().trim().min(2).max(100),
        email: z.email(),
        phone: z.string().trim().max(40).default(""),
        city: z.string().trim().min(1).max(60),
      }),
    );
    const row = await db.$transaction((tx) => createProfile(tx, now(), { ...input, authUserId: null }));
    return c.json({ token: await signDevToken(env, row.id), user: toUser(row, { withDocuments: true }) }, 201);
  });
