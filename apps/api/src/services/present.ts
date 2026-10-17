/**
 * Response shaping that needs I/O: swaps private storage references for short-lived signed URLs,
 * only on responses going to someone allowed to see the file.
 */
import type { Prisma } from "@prisma/client";
import type { MaintenanceRequest, PaymentInvoice, RentPlan } from "renton-shared/types";
import type { Storage } from "../lib/storage.js";
import { viewUrl } from "../lib/storage.js";
import { type profileInclude, toUser } from "../mappers.js";

export async function presentUser(storage: Storage | null, row: Prisma.ProfileGetPayload<{ include: typeof profileInclude }>, opts: Parameters<typeof toUser>[1]) {
  const user = toUser(row, opts);
  if (user.identity) {
    user.identity.documents = await Promise.all(user.identity.documents.map(async (d) => ({ ...d, url: await viewUrl(storage, d.url) })));
  }
  return user;
}

export async function presentInvoice(storage: Storage | null, invoice: PaymentInvoice) {
  if (invoice.receipt) invoice.receipt = { ...invoice.receipt, url: await viewUrl(storage, invoice.receipt.url) };
  return invoice;
}

export async function presentRentPlan(storage: Storage | null, plan: RentPlan) {
  plan.contributions = await Promise.all(plan.contributions.map(async (c) => ({ ...c, receipt: { ...c.receipt, url: await viewUrl(storage, c.receipt.url) } })));
  return plan;
}

export async function presentMaintenance(storage: Storage | null, req: MaintenanceRequest) {
  req.media = await Promise.all(req.media.map(async (m) => ({ ...m, url: await viewUrl(storage, m.url) })));
  return req;
}
