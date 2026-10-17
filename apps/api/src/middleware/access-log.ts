import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../context.js";

export const accessLog = createMiddleware<AppEnv>(async (c, next) => {
  const start = performance.now();
  await next();
  c.get("deps").logger.info("request", {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    ms: Math.round(performance.now() - start),
    requestId: c.get("requestId"),
  });
});
