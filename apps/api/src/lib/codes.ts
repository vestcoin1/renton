import { randomInt } from "node:crypto";

/**
 * Human-readable references (payment narrations, receipt and agreement numbers).
 * Formats match the prototype; uniqueness is checked against the database before use.
 */
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const letters = (n: number) => Array.from({ length: n }, () => ALPHA[randomInt(ALPHA.length)]).join("");
const digits = (n: number) => String(randomInt(10 ** (n - 1), 10 ** n));

export const codes = {
  /** Narration on a move-in transfer, e.g. HD-K7QX4821. */
  paymentReference: () => `HD-${letters(4)}${digits(4)}`,
  /** Narration on rent-plan transfers, e.g. HD-RENTK7QX4821. */
  rentPlanReference: () => `HD-RENT${letters(4)}${digits(4)}`,
  receiptNumber: () => `HD-RCT-${digits(8)}`,
  agreementNumber: (year: number) => `HD-TA-${year}-${digits(6)}`,
  rentReceiptNumber: () => `HD-RNT-${digits(8)}`,
  payoutReference: () => `HD-PAY-${digits(8)}`,
  refundReference: () => `HD-RFD-${digits(8)}`,
};

/** Generates codes until `taken` says one is free (collisions are rare; this bounds the loop). */
export async function uniqueCode(generate: () => string, taken: (code: string) => Promise<boolean>) {
  for (let i = 0; i < 10; i++) {
    const code = generate();
    if (!(await taken(code))) return code;
  }
  throw new Error("Could not generate a unique reference");
}
