import { Hono } from "hono";
import { z } from "zod";
import { requireUser, type CurrentUser } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";
import { ApiError } from "../lib/errors.js";
import { body } from "../lib/validate.js";
import { threadInclude, toThread } from "../mappers.js";
import { notify, type Db } from "../services/notifications.js";

const startSchema = z.object({
  /** Who to message. Omit to reach renton support. Tenants messaging about a listing can pass just `propertyId`. */
  recipientId: z.string().optional(),
  propertyId: z.string().optional(),
  body: z.string().trim().min(1).max(4000),
});

/**
 * Who may start a conversation with whom:
 * - anyone ↔ renton support (admins);
 * - a tenant → the landlord of a live listing, or of a home they've applied for or rent;
 * - a landlord → a tenant who has applied for or rents one of their homes;
 * - admins → anyone.
 */
async function resolveRecipient(db: Db, sender: CurrentUser, input: z.infer<typeof startSchema>) {
  if (!input.recipientId && !input.propertyId) {
    const support = await db.profile.findFirst({ where: { role: "admin", status: "active" }, orderBy: { joinedAt: "asc" } });
    if (!support) throw ApiError.notFound("Support");
    return { recipientId: support.id, propertyId: null };
  }
  const property = input.propertyId ? await db.property.findUnique({ where: { id: input.propertyId } }) : null;
  if (input.propertyId && !property) throw ApiError.notFound("Property");
  const recipientId = input.recipientId ?? property?.landlordId;
  if (!recipientId || recipientId === sender.id) throw ApiError.badRequest("Choose who to message.");
  const recipient = await db.profile.findUnique({ where: { id: recipientId } });
  if (!recipient) throw ApiError.notFound("Recipient");

  const allowed = await (async () => {
    if (sender.role === "admin" || recipient.role === "admin") return true;
    if (sender.role === "tenant" && recipient.role === "landlord") {
      if (property && property.landlordId === recipient.id && ["published", "verified"].includes(property.verification)) return true;
      const ties = await db.property.count({
        where: { landlordId: recipient.id, OR: [{ applications: { some: { tenantId: sender.id } } }, { leases: { some: { tenantId: sender.id } } }] },
      });
      return ties > 0;
    }
    if (sender.role === "landlord" && recipient.role === "tenant") {
      const ties = await db.property.count({
        where: { landlordId: sender.id, OR: [{ applications: { some: { tenantId: recipient.id } } }, { leases: { some: { tenantId: recipient.id } } }] },
      });
      return ties > 0;
    }
    return false;
  })();
  if (!allowed) throw ApiError.forbidden("You can only message landlords about their homes, your applicants and tenants, or renton support.");
  return { recipientId: recipient.id, propertyId: property?.id ?? null };
}

async function participantThread(db: Db, threadId: string, userId: string) {
  const thread = await db.messageThread.findUnique({ where: { id: threadId }, include: threadInclude });
  if (!thread || !thread.participants.some((p) => p.profileId === userId)) throw ApiError.notFound("Conversation");
  return thread;
}

/** Saves a message, bumps the thread, marks it read for the sender, and notifies everyone else in it. */
async function postMessage(db: Db, at: Date, threadId: string, sender: CurrentUser, text: string) {
  await db.message.create({ data: { threadId, senderId: sender.id, body: text, createdAt: at } });
  await db.messageThread.update({ where: { id: threadId }, data: { updatedAt: at } });
  await db.messageThreadParticipant.update({ where: { threadId_profileId: { threadId, profileId: sender.id } }, data: { lastReadAt: at } });
  const others = await db.messageThreadParticipant.findMany({ where: { threadId, profileId: { not: sender.id } }, include: { profile: { select: { role: true } } } });
  const from = sender.role === "admin" ? "renton Support" : sender.name;
  await notify(
    db,
    at,
    others.map((o) => [
      o.profileId,
      { title: `New message from ${from}`, body: text.length > 140 ? `${text.slice(0, 137)}…` : text, kind: "message", href: o.profile.role === "admin" ? undefined : `/${o.profile.role}/messages` },
    ]),
  );
}

export const messages = new Hono<AppEnv>()
  .use(requireUser())

  .get("/", async (c) => {
    const { db } = c.get("deps");
    const userId = c.get("user").id;
    const rows = await db.messageThread.findMany({ where: { participants: { some: { profileId: userId } } }, include: threadInclude, orderBy: { updatedAt: "desc" } });
    const items = rows.map((t) => toThread(t, userId));
    return c.json({ items, unread: items.reduce((n, t) => n + t.unread, 0) });
  })

  .get("/:id", async (c) => {
    const { db } = c.get("deps");
    const userId = c.get("user").id;
    return c.json({ thread: toThread(await participantThread(db, c.req.param("id"), userId), userId) });
  })

  /** Starts a conversation, or continues the existing one between the same two people about the same home. */
  .post("/", async (c) => {
    const { db, now } = c.get("deps");
    const sender = c.get("user");
    const input = await body(c, startSchema);
    const at = now();
    const threadId = await db.$transaction(async (tx) => {
      const { recipientId, propertyId } = await resolveRecipient(tx, sender, input);
      const existing = await tx.messageThread.findFirst({
        where: { propertyId, AND: [{ participants: { some: { profileId: sender.id } } }, { participants: { some: { profileId: recipientId } } }] },
        select: { id: true },
      });
      const id =
        existing?.id ??
        (await tx.messageThread.create({ data: { propertyId, createdAt: at, participants: { create: [{ profileId: sender.id }, { profileId: recipientId }] } } })).id;
      await postMessage(tx, at, id, sender, input.body);
      return id;
    });
    return c.json({ thread: toThread(await participantThread(db, threadId, sender.id), sender.id) }, 201);
  })

  .post("/:id/messages", async (c) => {
    const { db, now } = c.get("deps");
    const sender = c.get("user");
    const { body: text } = await body(c, z.object({ body: z.string().trim().min(1).max(4000) }));
    await participantThread(db, c.req.param("id"), sender.id);
    await db.$transaction((tx) => postMessage(tx, now(), c.req.param("id"), sender, text));
    return c.json({ thread: toThread(await participantThread(db, c.req.param("id"), sender.id), sender.id) }, 201);
  })

  .post("/:id/read", async (c) => {
    const { db, now } = c.get("deps");
    const userId = c.get("user").id;
    await participantThread(db, c.req.param("id"), userId);
    await db.messageThreadParticipant.update({ where: { threadId_profileId: { threadId: c.req.param("id"), profileId: userId } }, data: { lastReadAt: now() } });
    return c.json({ ok: true });
  });
