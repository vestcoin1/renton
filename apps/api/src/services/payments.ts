import { moveInFees, PAYMENT_WINDOW_DAYS } from "renton-core/fees";
import { codes, uniqueCode } from "../lib/codes.js";
import type { Db } from "./notifications.js";

const DAY = 86_400_000;

/** Raises the move-in invoice when a landlord approves an application: rent × years, caution deposit, 10% agency fee. */
export async function createMoveInInvoice(
  db: Db,
  now: Date,
  app: { id: string; tenantId: string; leaseYears: number },
  property: { id: string; landlordId: string; rent: number; cautionDeposit: number },
) {
  const { items, total } = moveInFees(property, app.leaseYears);
  const reference = await uniqueCode(codes.paymentReference, async (r) => !!(await db.paymentInvoice.findUnique({ where: { reference: r }, select: { id: true } })));
  return db.paymentInvoice.create({
    data: {
      applicationId: app.id,
      propertyId: property.id,
      tenantId: app.tenantId,
      landlordId: property.landlordId,
      reference,
      total,
      status: "awaiting_payment",
      dueDate: new Date(now.getTime() + PAYMENT_WINDOW_DAYS * DAY),
      createdAt: now,
      items: { create: items.map((i) => ({ key: i.key, label: i.label, amount: i.amount })) },
    },
  });
}
