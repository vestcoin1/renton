/**
 * Domain types. Each top-level entity maps 1:1 to a planned Supabase table
 * (see docs in README "Supabase migration"). Field names are camelCase here;
 * the service layer is responsible for mapping to/from snake_case columns.
 */

export type UserRole = "tenant" | "landlord" | "admin";

export type PropertyType =
  | "Self Contain"
  | "Mini Flat"
  | "Apartment"
  | "Terrace"
  | "Bungalow"
  | "Duplex"
  | "Penthouse";

/** Verification pipeline. `rejected` / `changes_requested` are side exits from `under_review`. */
export type VerificationStage =
  | "draft"
  | "submitted"
  | "inspection_scheduled"
  | "under_review"
  | "verified"
  | "published"
  | "changes_requested"
  | "rejected";

export type OccupancyStatus = "vacant" | "occupied" | "available_soon";

export type WaterSupply = "Borehole" | "Public Mains" | "Borehole + Treatment";
export type PowerSupply = "Prepaid Meter" | "Prepaid + Inverter" | "Prepaid + Generator" | "24/7 Estate Power";

export interface NearbyPlace {
  name: string;
  category: "school" | "hospital" | "shopping" | "transport" | "worship" | "recreation" | "bank";
  distanceKm: number;
}

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  description: string;
  state: string;
  city: string;
  area: string;
  address: string;
  /** Annual rent in Naira */
  rent: number;
  /** Annual service charge in Naira */
  serviceCharge: number;
  cautionDeposit: number;
  bedrooms: number;
  bathrooms: number;
  toilets: number;
  sizeSqm: number;
  furnished: boolean;
  parkingSpaces: number;
  waterSupply: WaterSupply;
  power: PowerSupply;
  security: boolean;
  amenities: string[];
  images: string[];
  verification: VerificationStage;
  occupancy: OccupancyStatus;
  availableFrom: string;
  landlordId: string;
  listedAt: string;
  views: number;
  featured?: boolean;
  nearby: NearbyPlace[];
  /** Last verified (ISO) â€” present once stage reaches `verified` */
  verifiedAt?: string;
}

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  city: string;
  joinedAt: string;
  identityVerified: boolean;
  status: "active" | "suspended" | "pending";
  avatarHue?: number;
  /** Identity (KYC) submission. Absent on seeded accounts, which fall back to `identityVerified`. */
  identity?: IdentityVerification;
}

/** `unverified` â†’ user uploads documents â†’ `pending` â†’ admin review â†’ `verified` | `rejected` (re-submit). */
export type IdentityStatus = "unverified" | "pending" | "verified" | "rejected";

/** Tenants and landlords are asked for different documents (see `lib/identity.ts` in the web app). */
export type IdentityDocumentKind = "government_id" | "selfie" | "proof_of_income" | "proof_of_address" | "cac_certificate";

export interface IdentityDocument {
  kind: IdentityDocumentKind;
  name: string;
  /** "image" files are compressed data URLs; "pdf" files are data URLs when small enough, else session-only object URLs. */
  fileKind: "image" | "pdf";
  url: string;
  uploadedAt: string;
}

export interface IdentityVerification {
  status: IdentityStatus;
  idType?: "NIN" | "International Passport" | "Driver's Licence" | "Voter's Card";
  idNumber?: string;
  documents: IdentityDocument[];
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface TenantProfile extends User {
  role: "tenant";
  occupation: string;
  employer: string;
  employmentType: "Full-time" | "Self-employed" | "Contract" | "Student";
  monthlyIncome: number;
  maritalStatus: "Single" | "Married";
  householdSize: number;
  guarantor?: string;
}

export interface LandlordProfile extends User {
  role: "landlord";
  company?: string;
  isDiaspora: boolean;
  residence: string;
  responseRate: number;
  responseTime: string;
  propertiesCount: number;
  rating: number;
}

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface Application {
  id: string;
  propertyId: string;
  tenantId: string;
  status: ApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  moveInDate: string;
  leaseYears: number;
  message: string;
  documents: string[];
  landlordNote?: string;
  /** Move-in invoice raised on approval. */
  invoiceId?: string;
}

export interface WaitingList {
  id: string;
  tenantId: string;
  city: string;
  areas: string[];
  propertyType: PropertyType | "Any";
  bedrooms: number;
  minBudget: number;
  maxBudget: number;
  moveIn: "Immediately" | "Within 1 month" | "1-3 months" | "Flexible";
  status: "active" | "paused" | "matched";
  createdAt: string;
}

export type LeaseStatus = "active" | "expiring" | "overdue" | "ended";

export interface Lease {
  id: string;
  propertyId: string;
  tenantId: string;
  unit: string;
  leaseStart: string;
  leaseEnd: string;
  annualRent: number;
  status: LeaseStatus;
  lastPaymentAt: string;
  /** Tenant's end-of-term decision, captured ahead of the rent due date. */
  intent?: LeaseIntent;
  /** Landlord-initiated rent change for the next term. */
  rentReview?: RentReview;
}

/**
 * Rent change for the next term. Current tenants can negotiate; tenants who have
 * not moved in yet cannot (negotiable: false, agreed immediately).
 * status: proposed = landlord offer awaiting tenant; countered = tenant offer awaiting landlord.
 */
export interface RentReview {
  id: string;
  currentRent: number;
  proposedRent: number;
  effectiveFrom: string;
  noticeServedAt: string;
  negotiable: boolean;
  status: "proposed" | "countered" | "agreed" | "withdrawn";
  offers: { id: string; by: "landlord" | "tenant"; amount: number; note?: string; at: string }[];
  agreedRent?: number;
  agreedAt?: string;
}

export interface LeaseIntent {
  decision: "renew" | "move_out";
  submittedAt: string;
  renewYears?: number;
  moveOutDate?: string;
  reason?: string;
  note?: string;
  landlordResponse?: { status: "accepted" | "acknowledged"; at: string };
}

export type DocumentStatus = "verified" | "pending" | "flagged";

export interface VerificationDocument {
  id: string;
  name: string;
  kind: "C of O" | "Deed of Assignment" | "Survey Plan" | "Governor's Consent" | "Building Approval" | "Owner ID" | "Utility Bill" | "Power of Attorney";
  uploadedAt: string;
  sizeKb: number;
  status: DocumentStatus;
}

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  done: boolean;
}

export interface VerificationRequest {
  id: string;
  propertyId: string;
  submittedAt: string;
  stage: VerificationStage;
  priority: "high" | "normal" | "low";
  inspector?: string;
  inspectionDate?: string;
  documents: VerificationDocument[];
  checklist: ChecklistItem[];
  notes: { id: string; author: string; body: string; createdAt: string }[];
  riskFlags: string[];
}

export type ReportCategory = "fraud" | "property" | "user";

export interface Report {
  id: string;
  category: ReportCategory;
  subject: string;
  subjectId: string;
  reason: string;
  details: string;
  reportedBy: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "investigating" | "resolved" | "dismissed";
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  kind: "application" | "verification" | "match" | "message" | "payment" | "system" | "maintenance" | "lease";
  createdAt: string;
  read: boolean;
  href?: string;
}

export interface Activity {
  id: string;
  label: string;
  detail: string;
  kind: "saved" | "applied" | "viewed" | "approved" | "message" | "waitlist" | "listing" | "payment" | "verification";
  createdAt: string;
}

export interface MessageThread {
  id: string;
  withName: string;
  withRole: UserRole;
  propertyId?: string;
  lastMessage: string;
  updatedAt: string;
  unread: number;
  messages: { id: string; fromMe: boolean; body: string; at: string }[];
}

export interface SearchFilters {
  q?: string;
  state?: string;
  city?: string;
  area?: string;
  type?: PropertyType | "Any";
  bedrooms?: number;
  bathrooms?: number;
  minBudget?: number;
  maxBudget?: number;
  furnished?: boolean;
  parking?: boolean;
  water?: boolean;
  security?: boolean;
  sort?: "recommended" | "price-asc" | "price-desc" | "newest";
}

export interface MatchResult {
  score: number;
  reasons: { label: string; met: boolean }[];
}

// â”€â”€â”€ Maintenance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type MaintenanceCategory =
  | "Plumbing"
  | "Electrical"
  | "Power / Generator"
  | "Air Conditioning"
  | "Roof / Leak"
  | "Doors & Security"
  | "Appliances"
  | "Pest Control"
  | "Other";

export type MaintenanceUrgency = "low" | "medium" | "high" | "emergency";

/** submitted â†’ investigating (admin) â†’ awaiting_approval (landlord) â†’ approved â†’ in_progress (technician) â†’ completed. */
export type MaintenanceStatus = "submitted" | "investigating" | "awaiting_approval" | "approved" | "declined" | "in_progress" | "completed";

export interface MaintenanceMedia {
  id: string;
  kind: "image" | "video";
  url: string;
  name: string;
}

export interface Technician {
  id: string;
  name: string;
  trade: string;
  company: string;
  phone: string;
  rating: number;
  jobsCompleted: number;
}

export interface MaintenanceRequest {
  id: string;
  leaseId: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  title: string;
  category: MaintenanceCategory;
  location: string;
  description: string;
  urgency: MaintenanceUrgency;
  media: MaintenanceMedia[];
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt: string;
  investigation?: { investigator: string; findings: string; recommendedFix: string; estimatedCost: number; at: string };
  landlordDecision?: { approved: boolean; note?: string; at: string };
  technician?: { technicianId: string; scheduledFor: string };
  completion?: { at: string; note: string };
  tenantFeedback?: { rating: number; comment?: string; at: string };
  timeline: { id: string; status: MaintenanceStatus; label: string; note?: string; by: string; at: string }[];
}

// â”€â”€â”€ Move-in payments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** awaiting_payment â†’ submitted (receipt uploaded) â†’ verified (lease starts) | rejected (re-upload). */
export type PaymentStatus = "awaiting_payment" | "submitted" | "verified" | "rejected";

export interface PaymentReceiptUpload {
  name: string;
  kind: "image" | "pdf";
  url: string;
  amountPaid: number;
  paidOn: string;
  payerBank: string;
  uploadedAt: string;
}

/** Move-in invoice raised when a landlord approves an application. Paid to renton. */
export interface PaymentInvoice {
  id: string;
  applicationId: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  reference: string;
  items: { key: "rent" | "caution" | "agency"; label: string; amount: number }[];
  total: number;
  createdAt: string;
  dueDate: string;
  status: PaymentStatus;
  receipt?: PaymentReceiptUpload;
  rejectionReason?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  /** Set on verification. */
  receiptNumber?: string;
  agreementNumber?: string;
  leaseId?: string;
}

// â”€â”€â”€ Caution deposit refunds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** requested â†’ approved (with any deductions) â†’ paid. Payable 30 days after move-out notice. */
export interface CautionRefund {
  id: string;
  leaseId: string;
  tenantId: string;
  propertyId: string;
  landlordId: string;
  amount: number;
  requestedAt: string;
  eligibleFrom: string;
  bank: { bankName: string; accountNumber: string; accountName: string };
  status: "requested" | "approved" | "paid";
  deduction?: { amount: number; reason: string };
  approvedAt?: string;
  paidAt?: string;
  payoutReference?: string;
}

// â”€â”€â”€ Rent installments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** One transfer towards a rent plan. Admin checks it against the bank statement. */
export interface RentContribution {
  id: string;
  amount: number;
  receipt: PaymentReceiptUpload;
  status: "submitted" | "verified" | "rejected";
  rejectionReason?: string;
  verifiedAt?: string;
  receiptNumber?: string;
}

/**
 * Tenant saves towards the next annual rent in installments (monthly or any amount),
 * paid into renton's account. Once the verified total covers the rent,
 * renton pays the landlord. One plan per lease term (`dueDate` = term end).
 */
export interface RentPlan {
  id: string;
  leaseId: string;
  tenantId: string;
  propertyId: string;
  landlordId: string;
  /** Narration tenants put on every transfer. */
  reference: string;
  /** The term this plan pays for starts here (the current lease end). */
  dueDate: string;
  schedule: "monthly" | "flexible";
  createdAt: string;
  contributions: RentContribution[];
  status: "saving" | "paid_out";
  /** Set when renton pays the landlord; the amount is frozen at this point. */
  payout?: { amount: number; reference: string; at: string; by: string };
}

