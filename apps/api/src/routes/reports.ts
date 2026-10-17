import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";
import { ApiError } from "../lib/errors.js";
import { body, query } from "../lib/validate.js";
import { toReport } from "../mappers.js";
import { ADMINS, notify } from "../services/notifications.js";

const STATUSES = ["open", "investigating", "resolved", "dismissed"] as const;

/** Any signed-in user can report a listing, a user or a scam. Fraud reports default to high severity. */
export const reports = new Hono<AppEnv>().post("/", requireUser(), async (c) => {
  const { db, now } = c.get("deps");
  const user = c.get("user");
  const input = await body(
    c,
    z.object({
      category: z.enum(["fraud", "property", "user"]),
      subject: z.string().trim().min(2).max(200),
      subjectId: z.string().trim().min(1).max(100),
      reason: z.string().trim().min(2).max(200),
      details: z.string().trim().min(10).max(4000),
    }),
  );
  const at = now();
  const severity = input.category === "fraud" ? "high" : "medium";
  const row = await db.$transaction(async (tx) => {
    const created = await tx.report.create({ data: { ...input, reporterName: user.name, severity, status: "open", createdAt: at } });
    await notify(tx, at, [[ADMINS, { title: input.category === "fraud" ? "New fraud report" : "New report", body: `${input.reason}: ${input.subject}`, kind: "system", href: "/admin/reports" }]]);
    return created;
  });
  return c.json({ report: toReport(row) }, 201);
});

export const adminReports = new Hono<AppEnv>()
  .use(requireUser("admin"))
  .get("/", async (c) => {
    const { status } = query(c, z.object({ status: z.enum(STATUSES).optional() }));
    const rows = await c.get("deps").db.report.findMany({ where: { status }, orderBy: { createdAt: "desc" } });
    return c.json({ items: rows.map(toReport) });
  })
  .patch("/:id", async (c) => {
    const input = await body(c, z.object({ status: z.enum(STATUSES).optional(), severity: z.enum(["critical", "high", "medium", "low"]).optional() }));
    const { count } = await c.get("deps").db.report.updateMany({ where: { id: c.req.param("id") }, data: input });
    if (count === 0) throw ApiError.notFound("Report");
    return c.json({ report: toReport(await c.get("deps").db.report.findUniqueOrThrow({ where: { id: c.req.param("id") } })) });
  });
