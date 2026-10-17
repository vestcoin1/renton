import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const fileEnv = loadEnv("test", process.cwd(), "");
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? fileEnv.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54329/renton_test?schema=public";

// Set on process.env too: globalSetup runs in the main process and does not receive test.env.
process.env.DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      DATABASE_URL: TEST_DATABASE_URL,
      CORS_ORIGINS: "http://localhost:3000",
      SUPABASE_JWT_SECRET: "test-supabase-jwt-secret-0123456789abcdef",
      DEV_AUTH: "true",
      DEV_AUTH_SECRET: "test-dev-auth-secret-0123456789abcdef",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
    globalSetup: ["test/global-setup.ts"],
    // Tests share one database; run files one at a time so they don't trample each other.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
