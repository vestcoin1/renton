import type { RentContribution, RentPlan } from "renton-shared/types";
import { PROPERTIES, daysAgo, daysAhead } from "./properties";
import { hoursAgo } from "./records";
import { mockTransferSlip } from "./payments";

const landlordOf = (id: string) => PROPERTIES.find((p) => p.id === id)!.landlordId;
const naira = (n: number) => `â‚¦${n.toLocaleString("en-NG")}`;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function contribution(id: string, amount: number, paidOn: string, opts: { reference: string; payer: string; bank: string; status: RentContribution["status"]; serial?: number }): RentContribution {
  return {
    id,
    amount,
    status: opts.status,
    receipt: {
      name: "transfer-receipt.png",
      kind: "image",
      url: mockTransferSlip({ amount: naira(amount), reference: opts.reference, payer: opts.payer, bank: opts.bank, date: shortDate(paidOn) }),
      amountPaid: amount,
      paidOn,
      payerBank: opts.bank,
      uploadedAt: paidOn,
    },
    ...(opts.status === "verified" ? { verifiedAt: paidOn, receiptNumber: `HD-RNT-${opts.serial}` } : {}),
  };
}

const chiamaka = { reference: "HD-RENT3B21", payer: "CHIAMAKA EZE", bank: "Demo Bank" };
const babatunde = { reference: "HD-RENTA884", payer: "BABATUNDE AFOLABI", bank: "Demo Bank" };

export const RENT_PLANS: RentPlan[] = [
  // Chiamaka is saving monthly for the term that starts when ls-5 ends; one transfer is waiting on admin.
  {
    id: "rp-1",
    leaseId: "ls-5",
    tenantId: "u-tenant-1",
    propertyId: "p-wus-010",
    landlordId: landlordOf("p-wus-010"),
    reference: chiamaka.reference,
    dueDate: daysAhead(55),
    schedule: "monthly",
    createdAt: daysAgo(150),
    status: "saving",
    contributions: [
      contribution("rc-11", 1_200_000, daysAgo(148), { ...chiamaka, status: "verified", serial: 410021 }),
      contribution("rc-12", 1_200_000, daysAgo(118), { ...chiamaka, status: "verified", serial: 410388 }),
      contribution("rc-13", 1_500_000, daysAgo(88), { ...chiamaka, status: "verified", serial: 410702 }),
      contribution("rc-14", 1_200_000, daysAgo(58), { ...chiamaka, status: "verified", serial: 411054 }),
      contribution("rc-15", 900_000, daysAgo(28), { ...chiamaka, status: "verified", serial: 411390 }),
      contribution("rc-16", 800_000, hoursAgo(26), { ...chiamaka, status: "submitted" }),
    ],
  },
  // Babatunde paid whatever he could and is now fully funded: ready for renton to pay the landlord.
  {
    id: "rp-2",
    leaseId: "ls-1",
    tenantId: "u-tenant-2",
    propertyId: "p-ikj-004",
    landlordId: landlordOf("p-ikj-004"),
    reference: babatunde.reference,
    dueDate: daysAhead(165),
    schedule: "flexible",
    createdAt: daysAgo(190),
    status: "saving",
    contributions: [
      contribution("rc-21", 5_000_000, daysAgo(185), { ...babatunde, status: "verified", serial: 409811 }),
      contribution("rc-22", 3_500_000, daysAgo(120), { ...babatunde, status: "verified", serial: 410455 }),
      contribution("rc-23", 2_000_000, daysAgo(40), { ...babatunde, status: "verified", serial: 411201 }),
      contribution("rc-24", 3_500_000, daysAgo(3), { ...babatunde, status: "verified", serial: 411622 }),
    ],
  },
];


