/**
 * One-off setup for a Supabase project (run from apps/api with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set).
 *
 *   npm run supabase:setup -- buckets       Create or update the Storage buckets the API uses.
 *   npm run supabase:setup -- demo-users    Create Supabase Auth logins (password "demo1234") for every
 *                                           seeded profile that has none, and link them via auth_user_id.
 *                                           Refused when NODE_ENV=production.
 */
import { PrismaClient } from "@prisma/client";
import { BUCKETS } from "../src/lib/storage.js";

/** Same as DEMO_PASSWORD in renton-core/auth (not imported: that module pulls in the client-side store). */
const DEMO_PASSWORD = "demo1234";

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (apps/api/.env).");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" };

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${url}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { ok: res.ok, status: res.status, json: text ? JSON.parse(text) : null };
}

async function buckets() {
  for (const b of Object.values(BUCKETS)) {
    const config = { public: b.public, file_size_limit: b.maxMb * 1024 * 1024, allowed_mime_types: [...b.types] };
    const created = await call("POST", "/storage/v1/bucket", { id: b.name, name: b.name, ...config });
    if (created.ok) {
      console.log(`created  ${b.name}${b.public ? " (public)" : ""}`);
      continue;
    }
    const updated = await call("PUT", `/storage/v1/bucket/${b.name}`, config);
    if (!updated.ok) throw new Error(`bucket ${b.name}: ${JSON.stringify(updated.json)}`);
    console.log(`updated  ${b.name}${b.public ? " (public)" : ""}`);
  }
}

async function findAuthUserId(email: string) {
  for (let page = 1; page < 50; page++) {
    const res = await call("GET", `/auth/v1/admin/users?page=${page}&per_page=200`);
    const users: { id: string; email?: string }[] = res.json?.users ?? [];
    const hit = users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (users.length < 200) return null;
  }
  return null;
}

async function demoUsers() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to create demo logins with a shared password in production.");
  const db = new PrismaClient();
  try {
    const profiles = await db.profile.findMany({ where: { authUserId: null }, select: { id: true, email: true } });
    for (const p of profiles) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
        console.warn(`skipped  ${p.id}: invalid email "${p.email}"`);
        continue;
      }
      const created = await call("POST", "/auth/v1/admin/users", { email: p.email, password: DEMO_PASSWORD, email_confirm: true });
      const authUserId = created.ok ? (created.json.id as string) : await findAuthUserId(p.email);
      if (!authUserId) throw new Error(`${p.email}: ${JSON.stringify(created.json)}`);
      await db.profile.update({ where: { id: p.id }, data: { authUserId } });
      console.log(`${created.ok ? "created" : "linked "}  ${p.email}`);
    }
  } finally {
    await db.$disconnect();
  }
}

const task = process.argv[2];
const tasks: Record<string, () => Promise<void>> = { buckets, "demo-users": demoUsers };
if (!task || !tasks[task]) {
  console.error(`Usage: npm run supabase:setup -- <${Object.keys(tasks).join(" | ")}>`);
  process.exit(1);
}
tasks[task]!().catch((err) => {
  console.error(err);
  process.exit(1);
});
