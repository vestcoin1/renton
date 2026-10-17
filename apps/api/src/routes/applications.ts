import { Hono } from "hono";
import { formatDate, formatNaira } from "renton-core/utils";
import { z } from "zod";
import { assertIdentitySubmitted, requireUser } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";
import { ApiError } from "../lib/errors.js";
import { body, isoDate } from "../lib/validate.js";
import { applicationInclude, isPublicStage, profileInclude, propertyInclude, toApplication, toProperty, toUser } from "../mappers.js";
import { notify } from "../services/notifications.js";
import { createMoveInInvoice } from "../services/payments.js";

const applySchema = z.object({
  propertyId: z.string().min(1),
  moveInDate: isoDate,
  leaseYears: z.number().int().min(1).max(5),
  message: z.string().trim().min(1).max(2000),
  documents: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
});

/** Tenant side: apply, list, withdraw. */
export const tenantApplications = new Hono<AppEnv>()
  .use(requireUser("tenant"))

  .get("/", async (c) => {
    const { db } = c.get("deps");
    const rows = await db.application.findMany({ where: { tenantId: c.get("user").id }, include: { ...applicationInclude, property: { include: propertyInclude } }, orderBy: { submittedAt: "desc" } });
    return c.json({ items: rows.map(toApplication), properties: uniqueById(rows.map((r) => toProperty(r.property))) });
  })

  .post("/", async (c) => {
    const { db, now } = c.get("deps");
    const user = c.get("user");
    assertIdentitySubmitted(user);
    const input = await body(c, applySchema);
    const property = await db.property.findUnique({ where: { id: input.propertyId } });
    if (!property || !isPublicStage(property.verification)) throw ApiError.notFound("Property");
    if (property.occupancy === "occupied") throw ApiError.rule("not_available", "This home has already been let.");
    const existing = await db.application.findFirst({ where: { tenantId: user.id, propertyId: property.id, status: { in: ["pending", "approved"] } } });
    if (existing) throw ApiError.conflict("You've already applied for this home.", "already_applied", { applicationId: existing.id });

    const at = now();
    const app = await db.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: { ...input, moveInDate: new Date(input.moveInDate), tenantId: user.id, status: "pending", submittedAt: at, updatedAt: at },
        include: applicationInclude,
      });
      await notify(tx, at, [
        [property.landlordId, { title: "New application received", body: `${user.name} applied for ${property.title}.`, kind: "application", href: "/landlord/applications" }],
      ]);
      return created;
    });
    return c.json({ application: toApplication(app) }, 201);
  })

  /** Withdraw a pending application (decided ones stay on record). */
  .delete("/:id", async (c) => {
    const { db } = c.get("deps");
    const app = await db.application.findUnique({ where: { id: c.req.param("id") } });
    if (!app || app.tenantId !== c.get("user").id) throw ApiError.notFound("Application");
    if (app.status !== "pending") throw ApiError.rule("cannot_withdraw", "Only pending applications can be withdrawn.");
    await db.application.delete({ where: { id: app.id } });
    return c.json({ ok: true });
  });

/** Landlord side: review applicants for their own homes and decide. Approval raises the move-in invoice. */
export const landlordApplications = new Hono<AppEnv>()
  .use(requireUser("landlord"))

  .get("/", async (c) => {
    const { db } = c.get("deps");
    const rows = await db.application.findMany({
      where: { property: { landlordId: c.get("user").id } },
      include: { ...applicationInclude, property: { include: propertyInclude }, tenant: { include: profileInclude } },
      orderBy: { submittedAt: "desc" },
    });
    return c.json({
      items: rows.map(toApplication),
      properties: uniqueById(rows.map((r) => toProperty(r.property))),
      tenants: uniqueById(rows.map((r) => toUser(r.tenant))),
    });
  })

  .post("/:id/decision", async (c) => {
    const { db, now } = c.get("deps");
    const input = await body(c, z.object({ status: z.enum(["approved", "rejected"]), note: z.string().trim().max(2000).optional() }));
    const app = await db.application.findUnique({ where: { id: c.req.param("id") }, include: { property: true } });
    if (!app || app.property.landlordId !== c.get("user").id) throw ApiError.notFound("Application");
    if (app.status !== "pending") throw ApiError.conflict("This application has already been decided.", "already_decided");
    if (input.status === "approved" && app.property.occupancy === "occupied") throw ApiError.rule("not_available", "This home is already occupied.");

    const at = now();
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: app.id },
        data: { status: input.status, landlordNote: input.note ?? app.landlordNote, updatedAt: at },
      });
      if (input.status === "approved") {
        const invoice = await createMoveInInvoice(tx, at, updated, app.property);
        await notify(tx, at, [
          [
            app.tenantId,
            {
              title: "Approved! Complete your payment 🎉",
              body: `${app.property.title} is yours once you pay ${formatNaira(invoice.total)} to renton (rent, caution deposit and 10% agency fee) by ${formatDate(invoice.dueDate.toISOString())}.`,
              kind: "payment",
              href: "/tenant/payments",
            },
          ],
        ]);
      } else {
        await notify(tx, at, [
          [app.tenantId, { title: "Application update", body: `Your application for ${app.property.title} was rejected.`, kind: "application", href: "/tenant/applications" }],
        ]);
      }
      return tx.application.findUniqueOrThrow({ where: { id: app.id }, include: applicationInclude });
    });
    return c.json({ application: toApplication(result) });
  });

export function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((i) => [i.id, i])).values()];
}
