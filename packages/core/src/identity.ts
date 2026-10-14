import type { IdentityDocumentKind, IdentityStatus, IdentityVerification, User, UserRole } from "renton-shared/types";

export interface DocumentRequirement {
  kind: IdentityDocumentKind;
  label: string;
  hint: string;
  optional?: boolean;
}

export const ID_TYPES: NonNullable<IdentityVerification["idType"]>[] = ["NIN", "International Passport", "Driver's Licence", "Voter's Card"];

const GOVERNMENT_ID: DocumentRequirement = {
  kind: "government_id",
  label: "Government-issued ID",
  hint: "NIN slip, international passport, driver's licence or voter's card. All four corners visible.",
};

/**
 * Documents each role must upload before they can transact. Tenants prove who they are and that
 * they can afford rent; landlords prove who they are and where they live (property ownership is
 * checked separately, per listing, in the property verification pipeline).
 */
export const IDENTITY_REQUIREMENTS: Record<Exclude<UserRole, "admin">, DocumentRequirement[]> = {
  tenant: [
    GOVERNMENT_ID,
    { kind: "selfie", label: "Selfie holding your ID", hint: "A clear photo of your face next to the same ID, so we can match them." },
    { kind: "proof_of_income", label: "Proof of income", hint: "Employment letter, or your last 3 months' bank statement if self-employed." },
  ],
  landlord: [
    GOVERNMENT_ID,
    { kind: "proof_of_address", label: "Proof of address", hint: "Utility bill or bank statement from the last 3 months showing your name and address." },
    { kind: "cac_certificate", label: "CAC certificate", hint: "Only if you let property through a registered company.", optional: true },
  ],
};

export const IDENTITY_STATUS_META: Record<IdentityStatus, { label: string; variant: "neutral" | "warning" | "success" | "destructive" }> = {
  unverified: { label: "Not verified", variant: "neutral" },
  pending: { label: "Under review", variant: "warning" },
  verified: { label: "Verified", variant: "success" },
  rejected: { label: "Action needed", variant: "destructive" },
};

/** Seeded demo users predate KYC submissions, so they fall back to the `identityVerified` flag. */
export function identityStatus(user: Pick<User, "identity" | "identityVerified">): IdentityStatus {
  return user.identity?.status ?? (user.identityVerified ? "verified" : "unverified");
}

/** Tenants can apply and landlords can list once documents are submitted; admin approval isn't a blocker. */
export function hasSubmittedIdentity(user: Pick<User, "identity" | "identityVerified">) {
  const s = identityStatus(user);
  return s === "pending" || s === "verified";
}

export function missingDocuments(role: Exclude<UserRole, "admin">, uploaded: IdentityDocumentKind[]) {
  return IDENTITY_REQUIREMENTS[role].filter((r) => !r.optional && !uploaded.includes(r.kind));
}

export const verifyPath = (role: Exclude<UserRole, "admin">) => `/${role}/verify`;


