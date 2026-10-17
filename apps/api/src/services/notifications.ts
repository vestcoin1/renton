import type { NotificationKind, Prisma } from "@prisma/client";

export type Db = Prisma.TransactionClient;

export interface NewNotification {
  title: string;
  body: string;
  kind: NotificationKind;
  href?: string;
}

/** Recipient meaning "every active admin" (the verification team's shared inbox in the prototype). */
export const ADMINS = "@admins";
export type Recipient = string;

/** Writes one notification per recipient. Call inside the same transaction as the change it describes. */
export async function notify(db: Db, now: Date, items: [Recipient, NewNotification][]) {
  if (items.length === 0) return;
  const adminIds = items.some(([to]) => to === ADMINS)
    ? (await db.profile.findMany({ where: { role: "admin", status: "active" }, select: { id: true } })).map((a) => a.id)
    : [];
  const rows = items.flatMap(([to, n]) =>
    (to === ADMINS ? adminIds : [to]).map((profileId) => ({ profileId, title: n.title, body: n.body, kind: n.kind, href: n.href ?? null, createdAt: now })),
  );
  if (rows.length) await db.notification.createMany({ data: rows });
}
