import { Hono } from "hono";
import type { AppEnv } from "../context.js";

const DB_TIMEOUT_MS = 2_000;

/** Liveness + database reachability. 503 when the database is down so load balancers drain the instance. */
export const health = new Hono<AppEnv>().get("/", async (c) => {
  const { db } = c.get("deps");
  let dbOk = false;
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), DB_TIMEOUT_MS)),
    ]);
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return c.json(
    { status: dbOk ? "ok" : "degraded", db: dbOk ? "ok" : "down", uptimeSeconds: Math.round(process.uptime()) },
    dbOk ? 200 : 503,
  );
});
