import type { ApplicationStatus, LeaseStatus, OccupancyStatus, Report, VerificationStage } from "renton-shared/types";

/** Mirrors the Badge variants in renton-ui (kept here so core has no UI dependency). */
export type Variant = "default" | "secondary" | "outline" | "success" | "warning" | "info" | "destructive" | "neutral" | "violet";

/** The canonical, happy-path verification pipeline shown throughout the product. */
export const VERIFICATION_FLOW: { stage: VerificationStage; label: string; description: string }[] = [
  { stage: "draft", label: "Draft", description: "Listing details being prepared" },
  { stage: "submitted", label: "Submitted", description: "Documents received by our team" },
  { stage: "inspection_scheduled", label: "Inspection Scheduled", description: "Field officer visit booked" },
  { stage: "under_review", label: "Under Review", description: "Title, identity and report review" },
  { stage: "verified", label: "Verified", description: "Passed all verification checks" },
  { stage: "published", label: "Published", description: "Live and visible to tenants" },
];

export const VERIFICATION_META: Record<VerificationStage, { label: string; variant: Variant }> = {
  draft: { label: "Draft", variant: "neutral" },
  submitted: { label: "Submitted", variant: "info" },
  inspection_scheduled: { label: "Inspection Scheduled", variant: "violet" },
  under_review: { label: "Pending Verification", variant: "warning" },
  verified: { label: "Verified", variant: "success" },
  published: { label: "Verified", variant: "success" },
  changes_requested: { label: "Changes Requested", variant: "warning" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export function flowIndex(stage: VerificationStage) {
  if (stage === "changes_requested" || stage === "rejected") return 3;
  return VERIFICATION_FLOW.findIndex((s) => s.stage === stage);
}

export function nextStage(stage: VerificationStage): VerificationStage | null {
  const order: VerificationStage[] = ["draft", "submitted", "inspection_scheduled", "under_review", "verified", "published"];
  if (stage === "changes_requested") return "submitted";
  const i = order.indexOf(stage);
  return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
}

export const OCCUPANCY_META: Record<OccupancyStatus, { label: string; variant: Variant; dot: string }> = {
  vacant: { label: "Vacant", variant: "success", dot: "bg-success" },
  occupied: { label: "Occupied", variant: "info", dot: "bg-primary" },
  available_soon: { label: "Available Soon", variant: "warning", dot: "bg-amber-500" },
};

export const APPLICATION_META: Record<ApplicationStatus, { label: string; variant: Variant }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export const LEASE_META: Record<LeaseStatus, { label: string; variant: Variant }> = {
  active: { label: "Active", variant: "success" },
  expiring: { label: "Expiring Soon", variant: "warning" },
  overdue: { label: "Overdue", variant: "destructive" },
  ended: { label: "Ended", variant: "neutral" },
};

export const SEVERITY_META: Record<Report["severity"], { label: string; variant: Variant }> = {
  critical: { label: "Critical", variant: "destructive" },
  high: { label: "High", variant: "warning" },
  medium: { label: "Medium", variant: "info" },
  low: { label: "Low", variant: "neutral" },
};

export const REPORT_STATUS_META: Record<Report["status"], { label: string; variant: Variant }> = {
  open: { label: "Open", variant: "warning" },
  investigating: { label: "Investigating", variant: "violet" },
  resolved: { label: "Resolved", variant: "success" },
  dismissed: { label: "Dismissed", variant: "neutral" },
};


