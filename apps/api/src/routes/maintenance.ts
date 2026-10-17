import type { MaintenanceStatus, Prisma } from "@prisma/client";
import { Hono } from "hono";
import { formatDate, formatNaira } from "renton-core/utils";
import { z } from "zod";
import { requireUser } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";
import { ApiError } from "../lib/errors.js";
import { assertOwnFile } from "../lib/storage.js";
import { body, isoDate, naira, query } from "../lib/validate.js";
import { maintenanceInclude, profileInclude, propertyInclude, toLease, leaseInclude, toMaintenance, toProperty, toTechnician, toUser } from "../mappers.js";
import { ADMINS, notify, type Db, type NewNotification } from "../services/notifications.js";
import { presentMaintenance } from "../services/present.js";
import { assertTransition } from "../services/tenancy.js";
import { uniqueById } from "./applications.js";

const CATEGORIES = ["Plumbing", "Electrical", "Power / Generator", "Air Conditioning", "Roof / Leak", "Doors & Security", "Appliances", "Pest Control", "Other"] as const;

const createSchema = z.object({
  leaseId: z.string().min(1),
  title: z.string().trim().min(3).max(120),
  category: z.enum(CATEGORIES),
  location: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(4000),
  urgency: z.enum(["low", "medium", "high", "emergency"]),
  media: z.array(z.object({ kind: z.enum(["image", "video"]), url: z.string().min(1), name: z.string().trim().min(1).max(200) })).max(10).default([]),
});

type Deps = AppEnv["Variables"]["deps"];

async function loadRequest(db: Db, id: string) {
  const row = await db.maintenanceRequest.findUnique({ where: { id }, include: { ...maintenanceInclude, property: true } });
  if (!row) throw ApiError.notFound("Repair request");
  return row;
}

/** Moves a request one step, only from the expected status, and appends the timeline entry. */
async function advance(
  db: Db,
  at: Date,
  id: string,
  step: { from: MaintenanceStatus[]; to: MaintenanceStatus; label: string; by: string; note?: string; data?: Prisma.MaintenanceRequestUncheckedUpdateManyInput },
) {
  const { count } = await db.maintenanceRequest.updateMany({ where: { id, status: { in: step.from } }, data: { ...step.data, status: step.to, updatedAt: at } });
  assertTransition(count, `This request isn't ${step.from.join(" or ").replace(/_/g, " ")}.`);
  await db.maintenanceEvent.create({ data: { requestId: id, status: step.to, label: step.label, note: step.note ?? null, byName: step.by, at } });
}

async function respond(deps: Deps, id: string) {
  return { request: await presentMaintenance(deps.storage, toMaintenance(await loadRequest(deps.db, id))) };
}

async function list(deps: Deps, where: Prisma.MaintenanceRequestWhereInput) {
  const rows = await deps.db.maintenanceRequest.findMany({
    where,
    include: { ...maintenanceInclude, property: { include: propertyInclude }, tenant: { include: profileInclude }, lease: { include: leaseInclude } },
    orderBy: { createdAt: "desc" },
  });
  return {
    items: await Promise.all(rows.map((r) => presentMaintenance(deps.storage, toMaintenance(r)))),
    properties: uniqueById(rows.map((r) => toProperty(r.property))),
    tenants: uniqueById(rows.map((r) => toUser(r.tenant))),
    leases: uniqueById(rows.map((r) => toLease(r.lease))),
  };
}

export const tenantMaintenance = new Hono<AppEnv>()
  .use(requireUser("tenant"))

  .get("/", async (c) => c.json(await list(c.get("deps"), { tenantId: c.get("user").id })))

  .post("/", async (c) => {
    const deps = c.get("deps");
    const user = c.get("user");
    const input = await body(c, createSchema);
    for (const m of input.media) assertOwnFile(deps.storage, "maintenance", user.id, m.url);
    const lease = await deps.db.lease.findUnique({ where: { id: input.leaseId }, include: { property: true } });
    if (!lease || lease.tenantId !== user.id) throw ApiError.notFound("Lease");
    if (lease.status === "ended") throw ApiError.rule("lease_ended", "Repairs can only be requested for your current home.");
    const at = deps.now();
    const created = await deps.db.$transaction(async (tx) => {
      const req = await tx.maintenanceRequest.create({
        data: {
          leaseId: lease.id,
          propertyId: lease.propertyId,
          tenantId: user.id,
          landlordId: lease.property.landlordId,
          title: input.title,
          category: input.category,
          location: input.location,
          description: input.description,
          urgency: input.urgency,
          status: "submitted",
          createdAt: at,
          updatedAt: at,
          media: { create: input.media },
          events: { create: { status: "submitted", label: "Request submitted", byName: user.name, at } },
        },
      });
      await notify(tx, at, [
        [ADMINS, { title: "New repair request", body: `${req.title} · ${lease.property.area}, ${lease.property.city}`, kind: "maintenance", href: "/admin/maintenance" }],
        [lease.property.landlordId, { title: "Tenant reported an issue", body: `${req.title}. renton is investigating.`, kind: "maintenance", href: "/landlord/maintenance" }],
      ]);
      return req;
    });
    return c.json(await respond(deps, created.id), 201);
  })

  .post("/:id/rating", async (c) => {
    const deps = c.get("deps");
    const input = await body(c, z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional() }));
    const req = await loadRequest(deps.db, c.req.param("id"));
    if (req.tenantId !== c.get("user").id) throw ApiError.notFound("Repair request");
    const { count } = await deps.db.maintenanceRequest.updateMany({
      where: { id: req.id, status: "completed", rating: null },
      data: { rating: input.rating, feedbackComment: input.comment ?? null, ratedAt: deps.now() },
    });
    if (count === 0) throw ApiError.conflict("You can rate a repair once, after it's completed.", "cannot_rate");
    return c.json(await respond(deps, req.id));
  });

export const landlordMaintenance = new Hono<AppEnv>()
  .use(requireUser("landlord"))

  .get("/", async (c) => c.json(await list(c.get("deps"), { landlordId: c.get("user").id })))

  .post("/:id/decision", async (c) => {
    const deps = c.get("deps");
    const user = c.get("user");
    const { approved, note } = await body(c, z.object({ approved: z.boolean(), note: z.string().trim().max(1000).optional() }));
    const req = await loadRequest(deps.db, c.req.param("id"));
    if (req.landlordId !== user.id) throw ApiError.notFound("Repair request");
    const at = deps.now();
    await deps.db.$transaction(async (tx) => {
      await advance(tx, at, req.id, {
        from: ["awaiting_approval"],
        to: approved ? "approved" : "declined",
        label: approved ? "Landlord approved repair" : "Landlord declined repair",
        by: user.name,
        note,
        data: { landlordApproved: approved, landlordNote: note ?? null, decidedAt: at },
      });
      await notify(tx, at, [
        [ADMINS, { title: approved ? "Repair approved: dispatch a technician" : "Repair declined by landlord", body: req.title, kind: "maintenance", href: "/admin/maintenance" }],
        [
          req.tenantId,
          {
            title: approved ? "Repair approved ✔" : "Repair update",
            body: approved ? `${req.title}: we're assigning a technician.` : `${req.title}: your landlord declined. ${note ?? ""}`.trim(),
            kind: "maintenance",
            href: "/tenant/repairs",
          },
        ],
      ]);
    });
    return c.json(await respond(deps, req.id));
  });

export const adminMaintenance = new Hono<AppEnv>()
  .use(requireUser("admin"))

  .get("/", async (c) => {
    const { status } = query(c, z.object({ status: z.enum(["submitted", "investigating", "awaiting_approval", "approved", "declined", "in_progress", "completed"]).optional() }));
    return c.json(await list(c.get("deps"), { status }));
  })

  .post("/:id/investigate", async (c) => {
    const deps = c.get("deps");
    const req = await loadRequest(deps.db, c.req.param("id"));
    const at = deps.now();
    await deps.db.$transaction(async (tx) => {
      await advance(tx, at, req.id, { from: ["submitted"], to: "investigating", label: "Investigation started", by: c.get("user").name });
      await notify(tx, at, [[req.tenantId, { title: "We're looking into your repair", body: "A renton officer is investigating your request.", kind: "maintenance", href: "/tenant/repairs" }]]);
    });
    return c.json(await respond(deps, req.id));
  })

  .post("/:id/report", async (c) => {
    const deps = c.get("deps");
    const admin = c.get("user");
    const input = await body(c, z.object({ findings: z.string().trim().min(3).max(4000), recommendedFix: z.string().trim().min(3).max(2000), estimatedCost: naira }));
    const req = await loadRequest(deps.db, c.req.param("id"));
    const at = deps.now();
    await deps.db.$transaction(async (tx) => {
      await advance(tx, at, req.id, {
        from: ["investigating"],
        to: "awaiting_approval",
        label: "Report sent to landlord",
        by: admin.name,
        note: `Estimated cost ${formatNaira(input.estimatedCost)}`,
        data: { ...input, investigatorName: admin.name, investigatedAt: at },
      });
      await notify(tx, at, [
        [req.landlordId, { title: "Repair needs your approval", body: `${req.title} · est. ${formatNaira(input.estimatedCost)}`, kind: "maintenance", href: "/landlord/maintenance" }],
        [req.tenantId, { title: "Investigation complete", body: `${req.title}: report sent to your landlord for approval.`, kind: "maintenance", href: "/tenant/repairs" }],
      ]);
    });
    return c.json(await respond(deps, req.id));
  })

  .post("/:id/dispatch", async (c) => {
    const deps = c.get("deps");
    const input = await body(c, z.object({ technicianId: z.string().min(1), scheduledFor: isoDate }));
    const req = await loadRequest(deps.db, c.req.param("id"));
    const tech = await deps.db.technician.findUnique({ where: { id: input.technicianId } });
    if (!tech || !tech.active) throw ApiError.notFound("Technician");
    const at = deps.now();
    const when = formatDate(new Date(input.scheduledFor).toISOString(), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    await deps.db.$transaction(async (tx) => {
      await advance(tx, at, req.id, {
        from: ["approved"],
        to: "in_progress",
        label: "Technician dispatched",
        by: "renton",
        note: `${tech.name} · ${tech.company}`,
        data: { technicianId: tech.id, scheduledFor: new Date(input.scheduledFor) },
      });
      await notify(tx, at, [
        [req.tenantId, { title: "Technician scheduled", body: `${tech.name} (${tech.trade}) will visit ${when}.`, kind: "maintenance", href: "/tenant/repairs" }],
        [req.landlordId, { title: "Technician dispatched", body: `${req.title} · ${tech.name}, ${when}`, kind: "maintenance", href: "/landlord/maintenance" }],
      ]);
    });
    return c.json(await respond(deps, req.id));
  })

  .post("/:id/complete", async (c) => {
    const deps = c.get("deps");
    const { note } = await body(c, z.object({ note: z.string().trim().min(3).max(2000) }));
    const req = await loadRequest(deps.db, c.req.param("id"));
    const tech = req.technicianId ? await deps.db.technician.findUnique({ where: { id: req.technicianId } }) : null;
    const at = deps.now();
    await deps.db.$transaction(async (tx) => {
      await advance(tx, at, req.id, { from: ["in_progress"], to: "completed", label: "Repair completed", by: tech?.name ?? "Technician", note, data: { completedAt: at, completionNote: note } });
      if (tech) await tx.technician.update({ where: { id: tech.id }, data: { jobsCompleted: { increment: 1 } } });
      const items: [string, NewNotification][] = [
        [req.tenantId, { title: "Repair completed 🎉", body: `${req.title}. Please rate the service.`, kind: "maintenance", href: "/tenant/repairs" }],
        [req.landlordId, { title: "Repair completed", body: req.title, kind: "maintenance", href: "/landlord/maintenance" }],
      ];
      await notify(tx, at, items);
    });
    return c.json(await respond(deps, req.id));
  });

export const technicians = new Hono<AppEnv>()
  .use(requireUser("admin"))
  .get("/", async (c) => {
    const rows = await c.get("deps").db.technician.findMany({ where: { active: true }, orderBy: [{ trade: "asc" }, { rating: "desc" }] });
    return c.json({ items: rows.map(toTechnician) });
  })
  .post("/", async (c) => {
    const input = await body(
      c,
      z.object({ name: z.string().trim().min(2).max(100), trade: z.string().trim().min(2).max(60), company: z.string().trim().min(2).max(100), phone: z.string().trim().min(5).max(40) }),
    );
    const row = await c.get("deps").db.technician.create({ data: input });
    return c.json({ technician: toTechnician(row) }, 201);
  })
  .patch("/:id", async (c) => {
    const { active } = await body(c, z.object({ active: z.boolean() }));
    const { count } = await c.get("deps").db.technician.updateMany({ where: { id: c.req.param("id") }, data: { active } });
    if (count === 0) throw ApiError.notFound("Technician");
    return c.json({ ok: true });
  });
