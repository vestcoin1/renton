import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";
import { ApiError } from "../lib/errors.js";
import { query } from "../lib/validate.js";
import { toNotification } from "../mappers.js";

export const notifications = new Hono<AppEnv>()
  .use(requireUser())

  .get("/", async (c) => {
    const { db } = c.get("deps");
    const user = c.get("user");
    const { unread, limit } = query(c, z.object({ unread: z.enum(["true", "false"]).optional(), limit: z.coerce.number().int().min(1).max(200).default(50) }));
    const [rows, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { profileId: user.id, ...(unread === "true" ? { read: false } : {}) },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
      }),
      db.notification.count({ where: { profileId: user.id, read: false } }),
    ]);
    return c.json({ items: rows.map(toNotification), unreadCount });
  })

  .post("/read-all", async (c) => {
    const { db } = c.get("deps");
    const { count } = await db.notification.updateMany({ where: { profileId: c.get("user").id, read: false }, data: { read: true } });
    return c.json({ updated: count });
  })

  .post("/:id/read", async (c) => {
    const { db } = c.get("deps");
    const { count } = await db.notification.updateMany({ where: { id: c.req.param("id"), profileId: c.get("user").id }, data: { read: true } });
    if (count === 0) throw ApiError.notFound("Notification");
    return c.json({ ok: true });
  });
