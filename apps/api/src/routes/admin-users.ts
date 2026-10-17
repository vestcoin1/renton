import type { Prisma } from "@prisma/client";
import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";
import { ApiError } from "../lib/errors.js";
import { body, query } from "../lib/validate.js";
import { profileInclude, toUser } from "../mappers.js";
import { notify } from "../services/notifications.js";
import { presentUser } from "../services/present.js";

const listSchema = z.object({
  role: z.enum(["tenant", "landlord", "admin"]).optional(),
  status: z.enum(["active", "suspended", "pending"]).optional(),
  identity: z.enum(["unverified", "pending", "verified", "rejected"]).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const reviewSchema = z
  .object({ approved: z.boolean(), reason: z.string().trim().max(500).optional() })
  .refine((v) => v.approved || !!v.reason, { message: "Give a reason when rejecting.", path: ["reason"] });

export const adminUsers = new Hono<AppEnv>()
  .use(requireUser("admin"))

  .get("/", async (c) => {
    const { db } = c.get("deps");
    const f = query(c, listSchema);
    const where: Prisma.ProfileWhereInput = {
      role: f.role,
      status: f.status,
      ...(f.identity ? { identity: { status: f.identity } } : {}),
      ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { email: { contains: f.q, mode: "insensitive" } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      db.profile.findMany({ where, include: profileInclude, orderBy: { joinedAt: "desc" }, skip: (f.page - 1) * f.pageSize, take: f.pageSize }),
      db.profile.count({ where }),
    ]);
    return c.json({ items: rows.map((r) => toUser(r)), total, page: f.page, pageSize: f.pageSize });
  })

  /** One user with their identity documents (signed URLs), for the ID review screen. */
  .get("/:id", async (c) => {
    const { db, storage } = c.get("deps");
    const row = await db.profile.findUnique({ where: { id: c.req.param("id") }, include: profileInclude });
    if (!row) throw ApiError.notFound("User");
    return c.json({ user: await presentUser(storage, row, { withDocuments: true }) });
  })

  .post("/:id/identity-review", async (c) => {
    const { db, now } = c.get("deps");
    const admin = c.get("user");
    const { approved, reason } = await body(c, reviewSchema);
    const target = await db.profile.findUnique({ where: { id: c.req.param("id") }, include: { identity: true } });
    if (!target) throw ApiError.notFound("User");
    if (target.role === "admin" || target.identity?.status !== "pending") {
      throw ApiError.conflict("There's no submission waiting for review.", "not_pending");
    }
    const at = now();
    const row = await db.$transaction(async (tx) => {
      await tx.identityVerification.update({
        where: { profileId: target.id },
        data: { status: approved ? "verified" : "rejected", reviewedAt: at, reviewedById: admin.id, rejectionReason: approved ? null : reason },
      });
      await tx.profile.update({ where: { id: target.id }, data: { identityVerified: approved } });
      await notify(tx, at, [
        [
          target.id,
          {
            title: approved ? "You're verified ✔" : "We couldn't verify your identity",
            body: approved ? "Your identity has been confirmed. A verified badge now shows on your profile." : `${reason} Please upload them again.`,
            kind: "verification",
            href: approved ? `/${target.role}` : `/${target.role}/verify`,
          },
        ],
      ]);
      return tx.profile.findUniqueOrThrow({ where: { id: target.id }, include: profileInclude });
    });
    return c.json({ user: toUser(row) });
  })

  .patch("/:id", async (c) => {
    const { db } = c.get("deps");
    const admin = c.get("user");
    const { status } = await body(c, z.object({ status: z.enum(["active", "suspended", "pending"]) }));
    const id = c.req.param("id");
    if (id === admin.id) throw ApiError.rule("cannot_change_self", "You can't change your own account status.");
    const target = await db.profile.findUnique({ where: { id }, select: { role: true } });
    if (!target) throw ApiError.notFound("User");
    if (target.role === "admin") throw ApiError.forbidden("Admin accounts are managed separately.");
    const row = await db.profile.update({ where: { id }, data: { status }, include: profileInclude });
    return c.json({ user: toUser(row) });
  });
