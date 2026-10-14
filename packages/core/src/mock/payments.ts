import type { PaymentInvoice } from "renton-shared/types";
import { moveInFees, PAYMENT_WINDOW_DAYS } from "../fees";
import { PROPERTIES, daysAgo } from "./properties";
import { hoursAgo } from "./records";

const prop = (id: string) => PROPERTIES.find((p) => p.id === id)!;

/** A simple bank-transfer slip image so the admin has something realistic to check. */
export function mockTransferSlip(opts: { amount: string; reference: string; payer: string; bank: string; date: string }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="760" viewBox="0 0 600 760">
  <rect width="600" height="760" fill="#ffffff"/>
  <rect width="600" height="120" fill="#5b2a86"/>
  <text x="40" y="70" font-family="Arial" font-size="30" font-weight="700" fill="#fff">${opts.bank}</text>
  <text x="40" y="100" font-family="Arial" font-size="16" fill="#e9d5ff">Transfer receipt</text>
  <circle cx="300" cy="200" r="38" fill="#dcfce7"/>
  <path d="M282 200l12 12 24-26" stroke="#16a34a" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="300" y="275" text-anchor="middle" font-family="Arial" font-size="20" fill="#475569">Transfer successful</text>
  <text x="300" y="320" text-anchor="middle" font-family="Arial" font-size="38" font-weight="700" fill="#0f172a">${opts.amount}</text>
  <line x1="40" y1="360" x2="560" y2="360" stroke="#e2e8f0" stroke-width="2"/>
  ${[
    ["Sender", opts.payer],
    ["Beneficiary", "renton Technologies Ltd"],
    ["Beneficiary bank", "Demo Bank Plc"],
    ["Account number", "0123456789"],
    ["Narration", opts.reference],
    ["Date", opts.date],
    ["Session ID", "100004260930141522901827364512"],
  ]
    .map(
      ([k, v], i) =>
        `<text x="40" y="${405 + i * 46}" font-family="Arial" font-size="16" fill="#64748b">${k}</text><text x="560" y="${405 + i * 46}" text-anchor="end" font-family="Arial" font-size="16" font-weight="600" fill="#0f172a">${v}</text>`
    )
    .join("")}
  <text x="300" y="735" text-anchor="middle" font-family="Arial" font-size="13" fill="#94a3b8">Demo receipt Â· not a real transaction</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const wuse = moveInFees(prop("p-wus-010"), 1);
const gra = moveInFees(prop("p-gra-014"), 1);
const naira = (n: number) => `â‚¦${n.toLocaleString("en-NG")}`;

export const INVOICES: PaymentInvoice[] = [
  // Chiamaka's current home: paid and verified ~10 months ago â†’ lease ls-5.
  {
    id: "inv-2001",
    applicationId: "app-1002",
    propertyId: "p-wus-010",
    tenantId: "u-tenant-1",
    landlordId: "u-landlord-1",
    reference: "HD-WUSE4471",
    ...wuse,
    createdAt: daysAgo(322),
    dueDate: daysAgo(322 - PAYMENT_WINDOW_DAYS),
    status: "verified",
    receipt: {
      name: "transfer-receipt.png",
      kind: "image",
      url: mockTransferSlip({ amount: naira(wuse.total), reference: "HD-WUSE4471", payer: "CHIAMAKA EZE", bank: "Demo Bank", date: "4 Dec 2025, 11:42" }),
      amountPaid: wuse.total,
      paidOn: daysAgo(318),
      payerBank: "Demo Bank",
      uploadedAt: daysAgo(318),
    },
    verifiedAt: daysAgo(317),
    verifiedBy: "Ibrahim Lawal",
    receiptNumber: "HD-RCT-000871",
    agreementNumber: "HD-TA-2025-0412",
    leaseId: "ls-5",
  },
  // Aisha (moving out of Jabi) has paid for GRA Phase 2 and is waiting on admin verification.
  {
    id: "inv-2002",
    applicationId: "app-1009",
    propertyId: "p-gra-014",
    tenantId: "u-tenant-3",
    landlordId: "u-landlord-1",
    reference: "HD-GRA27390",
    ...gra,
    createdAt: daysAgo(3),
    dueDate: daysAgo(3 - PAYMENT_WINDOW_DAYS),
    status: "submitted",
    receipt: {
      name: "gtbank-transfer.png",
      kind: "image",
      url: mockTransferSlip({ amount: naira(gra.total), reference: "HD-GRA27390", payer: "AISHA BELLO", bank: "Demo Bank", date: "5 Oct 2026, 16:08" }),
      amountPaid: gra.total,
      paidOn: hoursAgo(20),
      payerBank: "Demo Bank",
      uploadedAt: hoursAgo(18),
    },
  },
];


