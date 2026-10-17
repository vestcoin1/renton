import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { createDeps } from "./deps.js";
import { loadEnv } from "./env.js";
import { prisma } from "./lib/prisma.js";

const env = loadEnv();
const deps = createDeps(env, prisma);
const { logger } = deps;
const app = createApp(deps);

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info("renton-api listening", {
    port: info.port,
    env: env.NODE_ENV,
    auth: [env.SUPABASE_URL && "supabase-jwks", env.SUPABASE_JWT_SECRET && "supabase-hs256", env.DEV_AUTH && "dev"].filter(Boolean),
    storage: deps.storage ? "supabase" : "inline (development)",
  });
});

async function shutdown(signal: string) {
  logger.info("shutting down", { signal });
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
