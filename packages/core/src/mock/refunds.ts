import type { CautionRefund } from "renton-shared/types";
import { PROPERTIES, daysAgo, daysAhead } from "./properties";

const caution = (id: string) => PROPERTIES.find((p) => p.id === id)!.cautionDeposit;

export const REFUNDS: CautionRefund[] = [
  // Notice given 45 days ago â†’ payable now.
  {
    id: "rf-301",
    leaseId: "ls-3",
    tenantId: "u-tenant-4",
    propertyId: "p-gra-014",
    landlordId: "u-landlord-1",
    amount: caution("p-gra-014"),
    requestedAt: daysAgo(14),
    eligibleFrom: daysAgo(15),
    bank: { bankName: "Zenith Bank", accountNumber: "2081234567", accountName: "Tamuno Briggs" },
    status: "requested",
  },
  // Notice given 4 days ago â†’ still inside the 30-day wait.
  {
    id: "rf-302",
    leaseId: "ls-2",
    tenantId: "u-tenant-3",
    propertyId: "p-jab-013",
    landlordId: "u-landlord-1",
    amount: caution("p-jab-013"),
    requestedAt: daysAgo(2),
    eligibleFrom: daysAhead(26),
    bank: { bankName: "Access Bank", accountNumber: "0691234567", accountName: "Aisha Bello" },
    status: "requested",
  },
];


