import type { PaymentInvoice, Property } from "renton-shared/types";

/** renton's agency fee, charged on the rent being paid. */
export const AGENCY_RATE = 0.1;

/** Days a tenant has to pay after their application is approved. */
export const PAYMENT_WINDOW_DAYS = 7;

/** Where tenants pay move-in fees. Placeholder details for the prototype. */
export const renton_ACCOUNT = {
  accountName: "renton Technologies Ltd â€“ Client Account",
  bank: "Demo Bank Plc",
  accountNumber: "0123456789",
};

/**
 * Move-in fees paid to renton: rent for the lease term, the refundable
 * caution deposit, and a 10% agency fee on the rent. Service charge is paid
 * separately to the estate.
 */
export function moveInFees(property: Pick<Property, "rent" | "cautionDeposit">, leaseYears = 1) {
  const rent = property.rent * leaseYears;
  const items: PaymentInvoice["items"] = [
    { key: "rent", label: leaseYears > 1 ? `Rent (${leaseYears} years)` : "Rent (1 year)", amount: rent },
    { key: "caution", label: "Caution deposit (refundable)", amount: property.cautionDeposit },
    { key: "agency", label: `Agency fee (${AGENCY_RATE * 100}%)`, amount: Math.round(rent * AGENCY_RATE) },
  ];
  return { items, total: items.reduce((n, i) => n + i.amount, 0) };
}

export const paymentReference = () => `HD-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;


