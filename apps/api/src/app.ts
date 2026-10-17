import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { authenticate } from "./auth/middleware.js";
import type { AppDeps, AppEnv } from "./context.js";
import { ApiError, toErrorResponse } from "./lib/errors.js";
import { accessLog } from "./middleware/access-log.js";
import { adminOverview } from "./routes/admin-overview.js";
import { adminPayments, invoices } from "./routes/admin-payments.js";
import { adminUsers } from "./routes/admin-users.js";
import { landlordApplications, tenantApplications } from "./routes/applications.js";
import { adminProperties, adminVerifications } from "./routes/admin-verifications.js";
import { dev } from "./routes/dev.js";
import { health } from "./routes/health.js";
import { landlordProperties } from "./routes/landlord-properties.js";
import { landlordTenancy } from "./routes/landlord-tenancy.js";
import { adminMaintenance, landlordMaintenance, technicians, tenantMaintenance } from "./routes/maintenance.js";
import { me } from "./routes/me.js";
import { messages } from "./routes/messages.js";
import { notifications } from "./routes/notifications.js";
import { cities, landlords, properties } from "./routes/properties.js";
import { adminReports, reports } from "./routes/reports.js";
import { tenantTenancy } from "./routes/tenant-tenancy.js";
import { uploads } from "./routes/uploads.js";
import { saved, waitingLists } from "./routes/waiting-lists.js";

/**
 * Builds the HTTP app without binding a port, so tests call `app.request()` directly.
 * Feature routes live under `/v1`.
 */
export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  app.use(requestId());
  app.use(async (c, next) => {
    c.set("deps", deps);
    await next();
  });
  app.use(accessLog);
  app.use(secureHeaders());
  app.use(cors({ origin: deps.env.CORS_ORIGINS, credentials: true, exposeHeaders: ["X-Request-Id"] }));
  app.use(
    bodyLimit({
      maxSize: deps.env.BODY_LIMIT_MB * 1024 * 1024,
      onError: () => {
        throw new ApiError(413, "payload_too_large", `Request bodies are limited to ${deps.env.BODY_LIMIT_MB} MB. Upload large files to storage first.`);
      },
    }),
  );

  app.route("/health", health);

  const v1 = new Hono<AppEnv>();
  v1.use(authenticate);
  v1.route("/me", me);
  v1.route("/notifications", notifications);
  v1.route("/uploads", uploads);
  v1.route("/properties", properties);
  v1.route("/cities", cities);
  v1.route("/landlords", landlords);
  v1.route("/me/saved", saved);
  v1.route("/tenant/applications", tenantApplications);
  v1.route("/tenant/waiting-lists", waitingLists);
  v1.route("/threads", messages);
  v1.route("/reports", reports);
  v1.route("/tenant/maintenance", tenantMaintenance);
  v1.route("/tenant", tenantTenancy);
  v1.route("/invoices", invoices);
  v1.route("/landlord/properties", landlordProperties);
  v1.route("/landlord/applications", landlordApplications);
  v1.route("/landlord/maintenance", landlordMaintenance);
  v1.route("/landlord", landlordTenancy);
  v1.route("/admin/overview", adminOverview);
  v1.route("/admin/maintenance", adminMaintenance);
  v1.route("/admin/technicians", technicians);
  v1.route("/admin/reports", adminReports);
  v1.route("/admin", adminPayments);
  v1.route("/admin/users", adminUsers);
  v1.route("/admin/verifications", adminVerifications);
  v1.route("/admin/properties", adminProperties);
  if (deps.env.DEV_AUTH) v1.route("/dev", dev);
  app.route("/v1", v1);

  app.notFound((c) =>
    c.json({ error: { code: "not_found", message: `No route for ${c.req.method} ${c.req.path}.`, requestId: c.get("requestId") } }, 404),
  );

  app.onError((err, c) => {
    const { status, body } = toErrorResponse(err);
    if (status >= 500 && status !== 501) {
      deps.logger.error("unhandled error", { requestId: c.get("requestId"), path: c.req.path, err: err instanceof Error ? err.stack : String(err) });
    }
    return c.json({ error: { ...body, requestId: c.get("requestId") } }, status);
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
