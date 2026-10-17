import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

/**
 * Rebuilds the test database from the migrations once per run, so tests also prove the
 * migrations apply cleanly. Only touches a database whose name contains "test".
 */
export default async function setup() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/test/.test(new URL(url).pathname)) {
    throw new Error(`Refusing to reset ${url}: the test database name must contain "test".`);
  }

  const db = new PrismaClient({ datasourceUrl: url });
  try {
    await db.$executeRawUnsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await db.$executeRawUnsafe("CREATE SCHEMA public");
  } finally {
    await db.$disconnect();
  }

  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });
}
