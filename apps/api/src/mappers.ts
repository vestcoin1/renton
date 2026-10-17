/**
 * Database rows → renton-shared domain types. API responses use these shapes, so web, admin and
 * mobile keep rendering the same types they use today, and the pure rules in renton-core
 * (fees, tenancy-rules, matching) run unchanged on the server.
 */
import type { Prisma } from "@prisma/client";
import type {
  Application,
  CautionRefund,
  IdentityVerification,
  LandlordProfile,
  Lease,
  MaintenanceRequest,
  MessageThread,
  NearbyPlace,
  Notification,
  PaymentInvoice,
  PaymentReceiptUpload,
  Property,
  RentPlan,
  RentReview,
  Report,
  Technician,
  TenantProfile,
  User,
  VerificationRequest,
  WaitingList,
} from "renton-shared/types";

const iso = (d: Date) => d.toISOString();
const isoOpt = (d: Date | null | undefined) => (d ? d.toISOString() : undefined);
const opt = <T>(v: T | null | undefined) => (v === null ? undefined : v);

// ─── Includes (kept next to the mappers that need them) ───────────────────────

export const profileInclude = {
  tenantProfile: true,
  landlordProfile: true,
  identity: { include: { documents: { orderBy: { uploadedAt: "asc" } }, reviewedBy: { select: { name: true } } } },
} satisfies Prisma.ProfileInclude;
type ProfileRow = Prisma.ProfileGetPayload<{ include: typeof profileInclude }>;

export const propertyInclude = { images: { orderBy: { position: "asc" } } } satisfies Prisma.PropertyInclude;
type PropertyRow = Prisma.PropertyGetPayload<{ include: typeof propertyInclude }>;

export const verificationInclude = {
  documents: { orderBy: { uploadedAt: "asc" } },
  checklist: { orderBy: { position: "asc" } },
  notes: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
} satisfies Prisma.VerificationRequestInclude;
type VerificationRow = Prisma.VerificationRequestGetPayload<{ include: typeof verificationInclude }>;

export const applicationInclude = { invoice: { select: { id: true } } } satisfies Prisma.ApplicationInclude;
type ApplicationRow = Prisma.ApplicationGetPayload<{ include: typeof applicationInclude }>;

export const leaseInclude = {
  intent: true,
  rentReviews: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, include: { offers: { orderBy: [{ at: "asc" }, { id: "asc" }] } } },
} satisfies Prisma.LeaseInclude;
type LeaseRow = Prisma.LeaseGetPayload<{ include: typeof leaseInclude }>;

export const invoiceInclude = { items: true, receipt: true, verifiedBy: { select: { name: true } } } satisfies Prisma.PaymentInvoiceInclude;
type InvoiceRow = Prisma.PaymentInvoiceGetPayload<{ include: typeof invoiceInclude }>;

export const rentPlanInclude = {
  contributions: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { receipt: true } },
  payoutBy: { select: { name: true } },
} satisfies Prisma.RentPlanInclude;
type RentPlanRow = Prisma.RentPlanGetPayload<{ include: typeof rentPlanInclude }>;

export const maintenanceInclude = {
  media: true,
  events: { orderBy: [{ at: "asc" }, { id: "asc" }] },
} satisfies Prisma.MaintenanceRequestInclude;
type MaintenanceRow = Prisma.MaintenanceRequestGetPayload<{ include: typeof maintenanceInclude }>;

// ─── People ───────────────────────────────────────────────────────────────────

/**
 * `withDocuments` exposes identity document files: only for the user themselves and admins.
 * Other viewers still see the identity status.
 */
export function toUser(p: ProfileRow, opts: { withDocuments?: boolean; withContact?: boolean } = {}): User | TenantProfile | LandlordProfile {
  const { withDocuments = false, withContact = true } = opts;
  const identity: IdentityVerification | undefined = p.identity
    ? {
        status: p.identity.status,
        idType: opt(p.identity.idType) as IdentityVerification["idType"],
        idNumber: withDocuments ? opt(p.identity.idNumber) : undefined,
        documents: withDocuments
          ? p.identity.documents.map((d) => ({ kind: d.kind, name: d.name, fileKind: d.fileKind, url: d.url, uploadedAt: iso(d.uploadedAt) }))
          : [],
        submittedAt: isoOpt(p.identity.submittedAt),
        reviewedAt: isoOpt(p.identity.reviewedAt),
        reviewedBy: opt(p.identity.reviewedBy?.name),
        rejectionReason: opt(p.identity.rejectionReason),
      }
    : undefined;

  const base: User = {
    id: p.id,
    role: p.role,
    name: p.name,
    email: withContact ? p.email : "",
    phone: withContact ? p.phone : "",
    city: p.city,
    joinedAt: iso(p.joinedAt),
    identityVerified: p.identityVerified,
    status: p.status,
    avatarHue: opt(p.avatarHue),
    identity,
  };

  if (p.role === "tenant" && p.tenantProfile) {
    const t = p.tenantProfile;
    return {
      ...base,
      role: "tenant",
      occupation: t.occupation,
      employer: t.employer,
      employmentType: t.employmentType as TenantProfile["employmentType"],
      monthlyIncome: t.monthlyIncome,
      maritalStatus: t.maritalStatus as TenantProfile["maritalStatus"],
      householdSize: t.householdSize,
      guarantor: opt(t.guarantor),
    };
  }
  if (p.role === "landlord" && p.landlordProfile) {
    const l = p.landlordProfile;
    return {
      ...base,
      role: "landlord",
      company: opt(l.company),
      isDiaspora: l.isDiaspora,
      residence: l.residence,
      responseRate: l.responseRate,
      responseTime: l.responseTime,
      propertiesCount: l.propertiesCount,
      rating: l.rating,
    };
  }
  return base;
}

// ─── Properties & verification ────────────────────────────────────────────────

export function toProperty(p: PropertyRow): Property {
  return {
    id: p.id,
    title: p.title,
    type: p.type as Property["type"],
    description: p.description,
    state: p.state,
    city: p.city,
    area: p.area,
    address: p.address,
    rent: p.rent,
    serviceCharge: p.serviceCharge,
    cautionDeposit: p.cautionDeposit,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    toilets: p.toilets,
    sizeSqm: p.sizeSqm,
    furnished: p.furnished,
    parkingSpaces: p.parkingSpaces,
    waterSupply: p.waterSupply as Property["waterSupply"],
    power: p.power as Property["power"],
    security: p.security,
    amenities: p.amenities,
    images: p.images.map((i) => i.url),
    verification: p.verification,
    occupancy: p.occupancy,
    availableFrom: iso(p.availableFrom),
    landlordId: p.landlordId,
    listedAt: iso(p.listedAt),
    views: p.views,
    featured: p.featured,
    nearby: p.nearby as unknown as NearbyPlace[],
    verifiedAt: isoOpt(p.verifiedAt),
  };
}

export const isPublicStage = (stage: Property["verification"]) => stage === "published" || stage === "verified";

export function toVerification(v: VerificationRow): VerificationRequest {
  return {
    id: v.id,
    propertyId: v.propertyId,
    submittedAt: iso(v.submittedAt),
    stage: v.stage,
    priority: v.priority,
    inspector: opt(v.inspector),
    inspectionDate: isoOpt(v.inspectionDate),
    documents: v.documents.map((d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind as VerificationRequest["documents"][number]["kind"],
      uploadedAt: iso(d.uploadedAt),
      sizeKb: d.sizeKb,
      status: d.status,
    })),
    checklist: v.checklist.map((c) => ({ id: c.key, label: c.label, description: c.description, done: c.done })),
    notes: v.notes.map((n) => ({ id: n.id, author: n.authorName, body: n.body, createdAt: iso(n.createdAt) })),
    riskFlags: v.riskFlags,
  };
}

// ─── Applications & waiting lists ─────────────────────────────────────────────

export function toApplication(a: ApplicationRow): Application {
  return {
    id: a.id,
    propertyId: a.propertyId,
    tenantId: a.tenantId,
    status: a.status,
    submittedAt: iso(a.submittedAt),
    updatedAt: iso(a.updatedAt),
    moveInDate: iso(a.moveInDate),
    leaseYears: a.leaseYears,
    message: a.message,
    documents: a.documents,
    landlordNote: opt(a.landlordNote),
    invoiceId: a.invoice?.id,
  };
}

export function toWaitingList(w: Prisma.WaitingListGetPayload<object>): WaitingList {
  return {
    id: w.id,
    tenantId: w.tenantId,
    city: w.city,
    areas: w.areas,
    propertyType: w.propertyType as WaitingList["propertyType"],
    bedrooms: w.bedrooms,
    minBudget: w.minBudget,
    maxBudget: w.maxBudget,
    moveIn: w.moveIn as WaitingList["moveIn"],
    status: w.status,
    createdAt: iso(w.createdAt),
  };
}

// ─── Tenancy ──────────────────────────────────────────────────────────────────

export function toLease(l: LeaseRow): Lease {
  const r = l.rentReviews[0];
  const rentReview: RentReview | undefined = r
    ? {
        id: r.id,
        currentRent: r.currentRent,
        proposedRent: r.proposedRent,
        effectiveFrom: iso(r.effectiveFrom),
        noticeServedAt: iso(r.noticeServedAt),
        negotiable: r.negotiable,
        status: r.status,
        offers: r.offers.map((o) => ({ id: o.id, by: o.by, amount: o.amount, note: opt(o.note), at: iso(o.at) })),
        agreedRent: opt(r.agreedRent),
        agreedAt: isoOpt(r.agreedAt),
      }
    : undefined;
  return {
    id: l.id,
    propertyId: l.propertyId,
    tenantId: l.tenantId,
    unit: l.unit,
    leaseStart: iso(l.leaseStart),
    leaseEnd: iso(l.leaseEnd),
    annualRent: l.annualRent,
    status: l.status,
    lastPaymentAt: iso(l.lastPaymentAt ?? l.leaseStart),
    intent: l.intent
      ? {
          decision: l.intent.decision,
          submittedAt: iso(l.intent.submittedAt),
          renewYears: opt(l.intent.renewYears),
          moveOutDate: isoOpt(l.intent.moveOutDate),
          reason: opt(l.intent.reason),
          note: opt(l.intent.note),
          landlordResponse: l.intent.landlordResponse ? { status: l.intent.landlordResponse, at: iso(l.intent.landlordRespondedAt!) } : undefined,
        }
      : undefined,
    rentReview,
  };
}

// ─── Money ────────────────────────────────────────────────────────────────────

function toReceipt(r: Prisma.PaymentReceiptGetPayload<object>): PaymentReceiptUpload {
  return { name: r.name, kind: r.fileKind, url: r.url, amountPaid: r.amountPaid, paidOn: iso(r.paidOn), payerBank: r.payerBank, uploadedAt: iso(r.uploadedAt) };
}

const ITEM_ORDER = { rent: 0, caution: 1, agency: 2 } as const;

export function toInvoice(i: InvoiceRow): PaymentInvoice {
  return {
    id: i.id,
    applicationId: i.applicationId ?? "",
    propertyId: i.propertyId,
    tenantId: i.tenantId,
    landlordId: i.landlordId,
    reference: i.reference,
    items: [...i.items].sort((a, b) => ITEM_ORDER[a.key] - ITEM_ORDER[b.key]).map((it) => ({ key: it.key, label: it.label, amount: it.amount })),
    total: i.total,
    createdAt: iso(i.createdAt),
    dueDate: iso(i.dueDate),
    status: i.status,
    receipt: i.receipt ? toReceipt(i.receipt) : undefined,
    rejectionReason: opt(i.rejectionReason),
    verifiedAt: isoOpt(i.verifiedAt),
    verifiedBy: opt(i.verifiedBy?.name),
    receiptNumber: opt(i.receiptNumber),
    agreementNumber: opt(i.agreementNumber),
    leaseId: opt(i.leaseId),
  };
}

export function toRefund(r: Prisma.CautionRefundGetPayload<object>): CautionRefund {
  return {
    id: r.id,
    leaseId: r.leaseId,
    tenantId: r.tenantId,
    propertyId: r.propertyId,
    landlordId: r.landlordId,
    amount: r.amount,
    requestedAt: iso(r.requestedAt),
    eligibleFrom: iso(r.eligibleFrom),
    bank: { bankName: r.bankName, accountNumber: r.accountNumber, accountName: r.accountName },
    status: r.status,
    deduction: r.deductionAmount != null ? { amount: r.deductionAmount, reason: r.deductionReason ?? "" } : undefined,
    approvedAt: isoOpt(r.approvedAt),
    paidAt: isoOpt(r.paidAt),
    payoutReference: opt(r.payoutReference),
  };
}

export function toRentPlan(p: RentPlanRow): RentPlan {
  return {
    id: p.id,
    leaseId: p.leaseId,
    tenantId: p.tenantId,
    propertyId: p.propertyId,
    landlordId: p.landlordId,
    reference: p.reference,
    dueDate: iso(p.dueDate),
    schedule: p.schedule,
    createdAt: iso(p.createdAt),
    status: p.status,
    contributions: p.contributions.map((c) => ({
      id: c.id,
      amount: c.amount,
      receipt: toReceipt(c.receipt),
      status: c.status,
      rejectionReason: opt(c.rejectionReason),
      verifiedAt: isoOpt(c.verifiedAt),
      receiptNumber: opt(c.receiptNumber),
    })),
    payout:
      p.payoutAmount != null
        ? { amount: p.payoutAmount, reference: p.payoutReference ?? "", at: iso(p.payoutAt!), by: p.payoutBy?.name ?? "renton" }
        : undefined,
  };
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export function toTechnician(t: Prisma.TechnicianGetPayload<object>): Technician {
  return { id: t.id, name: t.name, trade: t.trade, company: t.company, phone: t.phone, rating: t.rating, jobsCompleted: t.jobsCompleted };
}

export function toMaintenance(m: MaintenanceRow): MaintenanceRequest {
  return {
    id: m.id,
    leaseId: m.leaseId,
    propertyId: m.propertyId,
    tenantId: m.tenantId,
    landlordId: m.landlordId,
    title: m.title,
    category: m.category as MaintenanceRequest["category"],
    location: m.location,
    description: m.description,
    urgency: m.urgency,
    media: m.media.map((x) => ({ id: x.id, kind: x.kind, url: x.url, name: x.name })),
    status: m.status,
    createdAt: iso(m.createdAt),
    updatedAt: iso(m.updatedAt),
    investigation:
      m.investigatedAt && m.findings != null
        ? {
            investigator: m.investigatorName ?? "renton",
            findings: m.findings,
            recommendedFix: m.recommendedFix ?? "",
            estimatedCost: m.estimatedCost ?? 0,
            at: iso(m.investigatedAt),
          }
        : undefined,
    landlordDecision: m.decidedAt && m.landlordApproved != null ? { approved: m.landlordApproved, note: opt(m.landlordNote), at: iso(m.decidedAt) } : undefined,
    technician: m.technicianId && m.scheduledFor ? { technicianId: m.technicianId, scheduledFor: iso(m.scheduledFor) } : undefined,
    completion: m.completedAt ? { at: iso(m.completedAt), note: m.completionNote ?? "" } : undefined,
    tenantFeedback: m.rating != null && m.ratedAt ? { rating: m.rating, comment: opt(m.feedbackComment), at: iso(m.ratedAt) } : undefined,
    timeline: m.events.map((e) => ({ id: e.id, status: e.status, label: e.label, note: opt(e.note), by: e.byName, at: iso(e.at) })),
  };
}

// ─── Trust & safety, notifications, messages ──────────────────────────────────

export function toReport(r: Prisma.ReportGetPayload<object>): Report {
  return {
    id: r.id,
    category: r.category,
    subject: r.subject,
    subjectId: r.subjectId,
    reason: r.reason,
    details: r.details,
    reportedBy: r.reporterName,
    severity: r.severity,
    status: r.status,
    createdAt: iso(r.createdAt),
  };
}

export function toNotification(n: Prisma.NotificationGetPayload<object>): Notification {
  return { id: n.id, title: n.title, body: n.body, kind: n.kind, createdAt: iso(n.createdAt), read: n.read, href: opt(n.href) };
}

export const threadInclude = {
  participants: { include: { profile: { select: { id: true, name: true, role: true } } } },
  messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
} satisfies Prisma.MessageThreadInclude;
type ThreadRow = Prisma.MessageThreadGetPayload<{ include: typeof threadInclude }>;

/** A thread from one participant's point of view (the shape the messages page renders). */
export function toThread(t: ThreadRow, viewerId: string): MessageThread & { withId: string } {
  const me = t.participants.find((p) => p.profileId === viewerId);
  const other = t.participants.find((p) => p.profileId !== viewerId)?.profile;
  const last = t.messages[t.messages.length - 1];
  const unread = t.messages.filter((m) => m.senderId !== viewerId && (!me?.lastReadAt || m.createdAt > me.lastReadAt)).length;
  return {
    id: t.id,
    withId: other?.id ?? "",
    withName: other?.role === "admin" ? "renton Support" : (other?.name ?? "Unknown"),
    withRole: other?.role ?? "admin",
    propertyId: opt(t.propertyId),
    lastMessage: last?.body ?? "",
    updatedAt: iso(last?.createdAt ?? t.updatedAt),
    unread,
    messages: t.messages.map((m) => ({ id: m.id, fromMe: m.senderId === viewerId, body: m.body, at: iso(m.createdAt) })),
  };
}
