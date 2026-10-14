"use client";

/**
 * Client-side mock database + session.
 *
 * Simulates the backend for interactive workflows (applying, verifying,
 * changing occupancyâ€¦) and persists to localStorage so changes survive
 * reloads. Each action corresponds to a future Supabase mutation / RPC.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Application,
  ApplicationStatus,
  CautionRefund,
  IdentityVerification,
  LandlordProfile,
  TenantProfile,
  RentReview,
  Lease,
  LeaseIntent,
  MaintenanceRequest,
  MaintenanceStatus,
  Notification,
  OccupancyStatus,
  PaymentInvoice,
  PaymentReceiptUpload,
  Property,
  RentContribution,
  RentPlan,
  Report,
  User,
  UserRole,
  VerificationRequest,
  VerificationStage,
  WaitingList,
} from "renton-shared/types";
import { PROPERTIES } from "./mock/properties";
import { ALL_USERS, DEMO_ACCOUNTS } from "./mock/users";
import { APPLICATIONS, DEFAULT_CHECKLIST, LEASES, NOTIFICATIONS, REPORTS, VERIFICATIONS, WAITING_LISTS } from "./mock/records";
import { MAINTENANCE, TECHNICIANS } from "./mock/maintenance";
import { INVOICES } from "./mock/payments";
import { REFUNDS } from "./mock/refunds";
import { RENT_PLANS } from "./mock/rent-plans";
import { canServeRentNotice, currentRentPlan, hasMovedIn, isRefundEligible, MIN_INSTALLMENT, refundEligibleFrom, rentPlanProgress } from "./tenancy-rules";
import { moveInFees, PAYMENT_WINDOW_DAYS, paymentReference } from "./fees";
import { formatDate, formatNaira } from "./utils";

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();

interface DbState {
  properties: Property[];
  applications: Application[];
  waitingLists: WaitingList[];
  leases: Lease[];
  verifications: VerificationRequest[];
  reports: Report[];
  users: User[];
  maintenance: MaintenanceRequest[];
  invoices: PaymentInvoice[];
  refunds: CautionRefund[];
  rentPlans: RentPlan[];
  /** Inbox per user id. */
  notifications: Record<string, Notification[]>;
  /** Email (lower-case) â†’ salted password hash. Becomes Supabase Auth. */
  credentials: Record<string, Credential>;
}

interface Credential {
  userId: string;
  salt: string;
  passwordHash: string;
}

export interface NewAccount {
  role: "tenant" | "landlord";
  name: string;
  email: string;
  phone: string;
  city: string;
  salt: string;
  passwordHash: string;
}

interface AppState extends DbState {
  /** Session: the signed-in user and their role (denormalised for quick role checks). */
  role: UserRole | null;
  userId: string | null;
  savedIds: string[];

  login: (userId: string) => void;
  /** Signs in to the seeded demo account for a role (role switcher). */
  loginDemo: (role: UserRole) => void;
  logout: () => void;
  resetDemo: () => void;
  registerAccount: (input: NewAccount) => User;

  // Identity (KYC): user uploads role-specific documents â†’ admin approves or rejects
  submitIdentity: (input: Pick<IdentityVerification, "idType" | "idNumber" | "documents">) => void;
  reviewIdentity: (userId: string, approved: boolean, reason?: string) => void;

  toggleSaved: (propertyId: string) => boolean;

  applyToProperty: (input: Pick<Application, "propertyId" | "moveInDate" | "leaseYears" | "message" | "documents">) => Application;
  setApplicationStatus: (id: string, status: ApplicationStatus, note?: string) => void;
  withdrawApplication: (id: string) => void;

  createWaitingList: (input: Omit<WaitingList, "id" | "tenantId" | "status" | "createdAt">) => WaitingList;
  setWaitingListStatus: (id: string, status: WaitingList["status"]) => void;
  deleteWaitingList: (id: string) => void;

  addProperty: (input: Omit<Property, "id" | "landlordId" | "listedAt" | "views" | "verification" | "occupancy" | "nearby">) => Property;
  setOccupancy: (propertyId: string, occupancy: OccupancyStatus, availableFrom?: string) => void;
  submitForVerification: (propertyId: string) => void;

  setVerificationStage: (propertyId: string, stage: VerificationStage, note?: string) => void;
  toggleChecklistItem: (verificationId: string, itemId: string) => void;
  addVerificationNote: (verificationId: string, body: string) => void;
  setDocumentStatus: (verificationId: string, docId: string, status: "verified" | "pending" | "flagged") => void;

  setReportStatus: (id: string, status: Report["status"]) => void;
  setUserStatus: (id: string, status: User["status"]) => void;

  markAllRead: () => void;
  markRead: (id: string) => void;

  // Maintenance: tenant â†’ admin investigation â†’ landlord approval â†’ technician â†’ done
  createMaintenanceRequest: (input: Pick<MaintenanceRequest, "leaseId" | "title" | "category" | "location" | "description" | "urgency" | "media">) => MaintenanceRequest;
  startInvestigation: (id: string) => void;
  sendInvestigationReport: (id: string, report: { findings: string; recommendedFix: string; estimatedCost: number }) => void;
  decideMaintenance: (id: string, approved: boolean, note?: string) => void;
  dispatchTechnician: (id: string, technicianId: string, scheduledFor: string) => void;
  completeMaintenance: (id: string, note: string) => void;
  rateMaintenance: (id: string, rating: number, comment?: string) => void;

  // Move-in payment: landlord approval â†’ invoice â†’ tenant uploads receipt â†’ admin verifies â†’ lease starts
  submitPaymentReceipt: (invoiceId: string, receipt: Omit<PaymentReceiptUpload, "uploadedAt">) => void;
  verifyPayment: (invoiceId: string) => void;
  rejectPayment: (invoiceId: string, reason: string) => void;

  // Caution refund: tenant requests after move-out notice â†’ admin approves (minus deductions) â†’ paid, â‰¥30 days after notice
  requestCautionRefund: (leaseId: string, bank: CautionRefund["bank"]) => CautionRefund | null;
  approveCautionRefund: (id: string, deduction?: { amount: number; reason: string }) => boolean;
  markRefundPaid: (id: string) => void;

  // Rent installments: tenant pays any amount to renton â†’ admin verifies each transfer â†’ once funded, renton pays the landlord
  startRentPlan: (leaseId: string, schedule: RentPlan["schedule"]) => RentPlan | null;
  setRentPlanSchedule: (planId: string, schedule: RentPlan["schedule"]) => void;
  submitRentContribution: (planId: string, receipt: Omit<RentContribution["receipt"], "uploadedAt">) => { ok: true } | { ok: false; reason: string };
  verifyRentContribution: (planId: string, contributionId: string) => void;
  rejectRentContribution: (planId: string, contributionId: string, reason: string) => void;
  payOutRentPlan: (planId: string) => boolean;

  // Rent review: landlord serves notice (â‰¥3 months) â†’ tenant accepts or counters â†’ agreed rent applies at renewal
  serveRentIncrease: (targets: { leaseId: string; newRent: number }[], note?: string) => { served: string[]; skipped: { leaseId: string; reason: string }[] };
  applyRentToNewTenants: (propertyId: string, newRent: number) => number;
  tenantRespondRent: (leaseId: string, response: { accept: true } | { counter: number; note?: string }) => void;
  landlordRespondRent: (leaseId: string, response: { acceptCounter: true } | { counter: number; note?: string } | { withdraw: true }) => void;

  // End-of-lease decision
  setLeaseIntent: (leaseId: string, intent: Omit<LeaseIntent, "submittedAt" | "landlordResponse">) => void;
  clearLeaseIntent: (leaseId: string) => void;
  respondToLeaseIntent: (leaseId: string) => void;
}

const seed = (): DbState => ({
  properties: structuredClone(PROPERTIES),
  applications: structuredClone(APPLICATIONS),
  waitingLists: structuredClone(WAITING_LISTS),
  leases: structuredClone(LEASES),
  verifications: structuredClone(VERIFICATIONS),
  reports: structuredClone(REPORTS),
  users: structuredClone(ALL_USERS),
  maintenance: structuredClone(MAINTENANCE),
  invoices: structuredClone(INVOICES),
  refunds: structuredClone(REFUNDS),
  rentPlans: structuredClone(RENT_PLANS),
  notifications: Object.fromEntries(Object.entries(NOTIFICATIONS).map(([role, items]) => [DEMO_ACCOUNTS[role as UserRole].id, structuredClone(items)])),
  // Seeded accounts all share the demo password (see DEMO_PASSWORD in lib/auth.ts).
  credentials: Object.fromEntries(ALL_USERS.map((u) => [u.email.toLowerCase(), { userId: u.id, salt: DEMO_SALT, passwordHash: DEMO_PASSWORD_HASH }])),
});

/** sha256("hd-demo-salt:demo1234"), precomputed so seeding stays synchronous. */
const DEMO_SALT = "hd-demo-salt";
const DEMO_PASSWORD_HASH = "899c5f07b2ef2d8d7e6e688273aa1ae771da3153b2db7e8f91283d17be55a74d";
const SAVED_SEED = ["p-vi-006", "p-mai-009", "p-gra-014"];

type NewNotification = Omit<Notification, "id" | "createdAt" | "read">;

/**
 * A user id, or a role meaning "that role's demo account" (admin = the verification team).
 * Prefer ids; the role form is for events whose recipient isn't on the record.
 */
type Recipient = UserRole | (string & {});
const isRole = (to: string): to is UserRole => to === "tenant" || to === "landlord" || to === "admin";
const inboxId = (to: Recipient) => (isRole(to) ? DEMO_ACCOUNTS[to].id : to);

const pushNotification = (s: Pick<AppState, "notifications">, to: Recipient, n: NewNotification) => {
  const id = inboxId(to);
  return { ...s.notifications, [id]: [{ ...n, id: uid("n"), createdAt: now(), read: false }, ...(s.notifications[id] ?? [])] };
};

/** Fan one event out to several users' notification feeds. */
const notifyMany = (s: Pick<AppState, "notifications">, items: [Recipient, NewNotification][]) =>
  items.reduce((acc, [to, n]) => pushNotification({ notifications: acc }, to, n), s.notifications);

const landlordOf = (s: Pick<AppState, "properties">, propertyId?: string) => s.properties.find((p) => p.id === propertyId)?.landlordId ?? "landlord";

/** Signed-in user's id, falling back to the role's demo account (scripts and pre-auth flows). */
const sessionUserId = (s: Pick<AppState, "userId">, role: "tenant" | "landlord") => s.userId ?? DEMO_ACCOUNTS[role].id;

/** Applies a status change, patch and timeline entry to one maintenance request. */
const advanceRequest = (s: AppState, id: string, status: MaintenanceStatus, label: string, by: string, patch: Partial<MaintenanceRequest> = {}, note?: string) =>
  s.maintenance.map((m) =>
    m.id === id ? { ...m, ...patch, status, updatedAt: now(), timeline: [...m.timeline, { id: uid("t"), status, label, by, note, at: now() }] } : m
  );

export const STORE_KEY = "renton-demo-v5";

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...seed(),
      role: null,
      userId: null,
      savedIds: SAVED_SEED,

      login: (userId) => {
        const user = get().users.find((u) => u.id === userId);
        if (!user) return;
        // Saved homes are per account; only the demo tenant starts with some.
        const savedIds = get().userId === userId ? get().savedIds : userId === DEMO_ACCOUNTS.tenant.id ? SAVED_SEED : [];
        set({ userId, role: user.role, savedIds });
      },
      loginDemo: (role) => get().login(DEMO_ACCOUNTS[role].id),
      logout: () => set({ role: null, userId: null }),
      resetDemo: () =>
        set((s) => {
          const db = seed();
          // Accounts created during the demo are wiped, so sign them out.
          const keep = db.users.some((u) => u.id === s.userId);
          return { ...db, savedIds: SAVED_SEED, ...(keep ? {} : { role: null, userId: null }) };
        }),

      registerAccount: ({ role, name, email, phone, city, salt, passwordHash }) => {
        const base = {
          id: uid(`u-${role}`),
          name,
          email,
          phone,
          city,
          joinedAt: now(),
          identityVerified: false,
          status: "active" as const,
          avatarHue: Math.floor(Math.random() * 360),
          identity: { status: "unverified" as const, documents: [] },
        };
        const user: TenantProfile | LandlordProfile =
          role === "tenant"
            ? { ...base, role, occupation: "", employer: "", employmentType: "Full-time", monthlyIncome: 0, maritalStatus: "Single", householdSize: 1 }
            : { ...base, role, isDiaspora: false, residence: `${city}, Nigeria`, responseRate: 100, responseTime: "within a day", propertiesCount: 0, rating: 0 };
        set((s) => ({
          users: [...s.users, user],
          credentials: { ...s.credentials, [email]: { userId: user.id, salt, passwordHash } },
          role: user.role,
          userId: user.id,
          savedIds: [],
          notifications: pushNotification(s, user.id, {
            title: "Verify your identity",
            body:
              role === "tenant"
                ? "Upload your ID, a selfie and proof of income so landlords can accept your applications."
                : "Upload your ID and proof of address before you list a property.",
            kind: "verification",
            href: `/${role}/verify`,
          }),
        }));
        return user;
      },

      submitIdentity: (input) =>
        set((s) => {
          const user = s.users.find((u) => u.id === s.userId);
          if (!user || user.role === "admin") return {};
          const identity: IdentityVerification = { ...input, status: "pending", submittedAt: now() };
          return {
            users: s.users.map((u) => (u.id === user.id ? { ...u, identity, identityVerified: false } : u)),
            notifications: pushNotification(s, "admin", {
              title: "Identity documents to review",
              body: `${user.name} (${user.role}) submitted ${input.documents.length} document${input.documents.length === 1 ? "" : "s"} for verification.`,
              kind: "verification",
              href: `/admin/users?review=${user.id}`,
            }),
          };
        }),

      reviewIdentity: (userId, approved, reason) =>
        set((s) => {
          const user = s.users.find((u) => u.id === userId);
          if (!user?.identity || user.identity.status !== "pending" || user.role === "admin") return {};
          const reviewer = s.users.find((u) => u.id === s.userId)?.name ?? DEMO_ACCOUNTS.admin.name;
          const identity: IdentityVerification = {
            ...user.identity,
            status: approved ? "verified" : "rejected",
            reviewedAt: now(),
            reviewedBy: reviewer,
            rejectionReason: approved ? undefined : reason,
          };
          return {
            users: s.users.map((u) => (u.id === userId ? { ...u, identity, identityVerified: approved } : u)),
            notifications: pushNotification(s, userId, {
              title: approved ? "You're verified âœ”" : "We couldn't verify your identity",
              body: approved ? "Your identity has been confirmed. A verified badge now shows on your profile." : `${reason ?? "Your documents couldn't be verified."} Please upload them again.`,
              kind: "verification",
              href: approved ? `/${user.role}` : `/${user.role}/verify`,
            }),
          };
        }),

      toggleSaved: (propertyId) => {
        const saved = get().savedIds.includes(propertyId);
        set((s) => ({ savedIds: saved ? s.savedIds.filter((id) => id !== propertyId) : [propertyId, ...s.savedIds] }));
        return !saved;
      },

      applyToProperty: (input) => {
        const app: Application = {
          ...input,
          id: uid("app"),
          tenantId: sessionUserId(get(), "tenant"),
          status: "pending",
          submittedAt: now(),
          updatedAt: now(),
        };
        set((s) => {
          const property = s.properties.find((p) => p.id === input.propertyId);
          const tenant = s.users.find((u) => u.id === app.tenantId);
          return {
            applications: [app, ...s.applications],
            notifications: pushNotification(s, landlordOf(s, input.propertyId), {
              title: "New application received",
              body: `${tenant?.name ?? "A tenant"} applied for ${property?.title ?? "your property"}.`,
              kind: "application",
              href: "/landlord/applications",
            }),
          };
        });
        return app;
      },

      setApplicationStatus: (id, status, note) =>
        set((s) => {
          const app = s.applications.find((a) => a.id === id);
          const property = s.properties.find((p) => p.id === app?.propertyId);
          if (!app || !property) return {};

          let invoice: PaymentInvoice | undefined;
          if (status === "approved" && !app.invoiceId) {
            const fees = moveInFees(property, app.leaseYears);
            invoice = {
              id: uid("inv"),
              applicationId: app.id,
              propertyId: property.id,
              tenantId: app.tenantId,
              landlordId: property.landlordId,
              reference: paymentReference(),
              ...fees,
              createdAt: now(),
              dueDate: new Date(Date.now() + PAYMENT_WINDOW_DAYS * 86400000).toISOString(),
              status: "awaiting_payment",
            };
          }

          const tenantNote: NewNotification = invoice
              ? {
                  title: "Approved! Complete your payment ðŸŽ‰",
                  body: `${property.title} is yours once you pay ${formatNaira(invoice.total)} to renton (rent, caution deposit and 10% agency fee) by ${formatDate(invoice.dueDate)}.`,
                  kind: "payment",
                  href: "/tenant/payments",
                }
              : { title: "Application update", body: `Your application for ${property.title} was ${status}.`, kind: "application", href: "/tenant/applications" };

          return {
            applications: s.applications.map((a) =>
              a.id === id ? { ...a, status, updatedAt: now(), landlordNote: note ?? a.landlordNote, invoiceId: invoice?.id ?? a.invoiceId } : a
            ),
            invoices: invoice ? [invoice, ...s.invoices] : s.invoices,
            notifications: pushNotification(s, app.tenantId, tenantNote),
          };
        }),

      submitPaymentReceipt: (invoiceId, receipt) =>
        set((s) => {
          const inv = s.invoices.find((i) => i.id === invoiceId);
          const property = s.properties.find((p) => p.id === inv?.propertyId);
          const tenant = s.users.find((u) => u.id === inv?.tenantId);
          return {
            invoices: s.invoices.map((i) => (i.id === invoiceId ? { ...i, status: "submitted" as const, rejectionReason: undefined, receipt: { ...receipt, uploadedAt: now() } } : i)),
            notifications: notifyMany(s, [
              [
                "admin",
                {
                  title: "Payment receipt to verify",
                  body: `${tenant?.name} paid ${formatNaira(receipt.amountPaid)} for ${property?.title} (ref ${inv?.reference}).`,
                  kind: "payment",
                  href: "/admin/payments",
                },
              ],
            ]),
          };
        }),

      verifyPayment: (invoiceId) =>
        set((s) => {
          const inv = s.invoices.find((i) => i.id === invoiceId);
          const app = s.applications.find((a) => a.id === inv?.applicationId);
          const property = s.properties.find((p) => p.id === inv?.propertyId);
          const tenant = s.users.find((u) => u.id === inv?.tenantId);
          if (!inv || !app || !property) return {};

          // Tenancy runs from the agreed move-in date for the agreed term.
          const start = new Date(app.moveInDate);
          const end = new Date(start);
          end.setFullYear(end.getFullYear() + app.leaseYears);
          const lease: Lease = {
            id: uid("ls"),
            propertyId: property.id,
            tenantId: inv.tenantId,
            unit: "Main unit",
            leaseStart: start.toISOString(),
            leaseEnd: end.toISOString(),
            annualRent: property.rent,
            status: "active",
            lastPaymentAt: inv.receipt?.paidOn ?? now(),
          };
          const serial = Math.floor(100000 + Math.random() * 900000);

          return {
            invoices: s.invoices.map((i) =>
              i.id === invoiceId
                ? {
                    ...i,
                    status: "verified" as const,
                    verifiedAt: now(),
                    verifiedBy: DEMO_ACCOUNTS.admin.name,
                    receiptNumber: `HD-RCT-${serial}`,
                    agreementNumber: `HD-TA-${new Date().getFullYear()}-${String(serial).slice(0, 4)}`,
                    leaseId: lease.id,
                  }
                : i
            ),
            leases: [lease, ...s.leases],
            // The home is now let: mark it occupied and close other pending applications.
            properties: s.properties.map((p) => (p.id === property.id ? { ...p, occupancy: "occupied" as const } : p)),
            applications: s.applications.map((a) =>
              a.propertyId === property.id && a.status === "pending" && a.id !== app.id
                ? { ...a, status: "rejected" as const, updatedAt: now(), landlordNote: "This home has now been let to another applicant." }
                : a
            ),
            notifications: notifyMany(s, [
              [
                inv.tenantId,
                {
                  title: "Payment verified Â· welcome home ðŸ”‘",
                  body: `Your tenancy agreement and payment receipt for ${property.title} are ready to download from your profile.`,
                  kind: "payment",
                  href: "/tenant/profile#documents",
                },
              ],
              [
                inv.landlordId,
                {
                  title: "Payment verified Â· tenancy started",
                  body: `${tenant?.name} has paid for ${property.title}. The property is now marked occupied.`,
                  kind: "payment",
                  href: "/landlord/tenants",
                },
              ],
            ]),
          };
        }),

      rejectPayment: (invoiceId, reason) =>
        set((s) => {
          const inv = s.invoices.find((i) => i.id === invoiceId);
          return {
            invoices: s.invoices.map((i) => (i.id === invoiceId ? { ...i, status: "rejected" as const, rejectionReason: reason } : i)),
            notifications: inv
              ? pushNotification(s, inv.tenantId, { title: "We couldn't verify your payment", body: `${reason} Please upload a new receipt.`, kind: "payment", href: "/tenant/payments" })
              : s.notifications,
          };
        }),

      withdrawApplication: (id) => set((s) => ({ applications: s.applications.filter((a) => a.id !== id) })),

      createWaitingList: (input) => {
        const wl: WaitingList = { ...input, id: uid("wl"), tenantId: sessionUserId(get(), "tenant"), status: "active", createdAt: now() };
        set((s) => ({ waitingLists: [wl, ...s.waitingLists] }));
        return wl;
      },
      setWaitingListStatus: (id, status) => set((s) => ({ waitingLists: s.waitingLists.map((w) => (w.id === id ? { ...w, status } : w)) })),
      deleteWaitingList: (id) => set((s) => ({ waitingLists: s.waitingLists.filter((w) => w.id !== id) })),

      addProperty: (input) => {
        const property: Property = {
          ...input,
          id: uid("p"),
          landlordId: sessionUserId(get(), "landlord"),
          listedAt: now(),
          views: 0,
          verification: "submitted",
          occupancy: "vacant",
          nearby: [],
        };
        const vr: VerificationRequest = {
          id: uid("vr"),
          propertyId: property.id,
          submittedAt: now(),
          stage: "submitted",
          priority: "normal",
          documents: [
            { id: "d1", name: "Title_Document.pdf", kind: "C of O", uploadedAt: now(), sizeKb: 1820, status: "pending" },
            { id: "d2", name: "Owner_ID.jpg", kind: "Owner ID", uploadedAt: now(), sizeKb: 480, status: "pending" },
          ],
          checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c, done: false })),
          notes: [],
          riskFlags: [],
        };
        set((s) => ({
          properties: [property, ...s.properties],
          verifications: [vr, ...s.verifications],
          notifications: pushNotification(s, "admin", {
            title: "New verification submission",
            body: `${property.title} in ${property.area}, ${property.city}.`,
            kind: "verification",
            href: `/admin/verifications/${vr.id}`,
          }),
        }));
        return property;
      },

      setOccupancy: (propertyId, occupancy, availableFrom) =>
        set((s) => ({
          properties: s.properties.map((p) => (p.id === propertyId ? { ...p, occupancy, availableFrom: availableFrom ?? p.availableFrom } : p)),
        })),

      submitForVerification: (propertyId) => get().setVerificationStage(propertyId, "submitted"),

      setVerificationStage: (propertyId, stage, note) =>
        set((s) => {
          const property = s.properties.find((p) => p.id === propertyId);
          const exists = s.verifications.some((v) => v.propertyId === propertyId);
          const verifications = exists
            ? s.verifications.map((v) =>
                v.propertyId === propertyId
                  ? {
                      ...v,
                      stage,
                      notes: note ? [...v.notes, { id: uid("note"), author: DEMO_ACCOUNTS.admin.name, body: note, createdAt: now() }] : v.notes,
                    }
                  : v
              )
            : [
                {
                  id: uid("vr"),
                  propertyId,
                  submittedAt: now(),
                  stage,
                  priority: "normal" as const,
                  documents: [],
                  checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c, done: false })),
                  notes: [],
                  riskFlags: [],
                },
                ...s.verifications,
              ];
          const labels: Partial<Record<VerificationStage, string>> = {
            inspection_scheduled: "Inspection scheduled",
            under_review: "Listing under review",
            verified: "Listing verified âœ”",
            published: "Listing is now live",
            changes_requested: "Changes requested",
            rejected: "Listing rejected",
          };
          return {
            verifications,
            properties: s.properties.map((p) =>
              p.id === propertyId ? { ...p, verification: stage, verifiedAt: stage === "verified" || stage === "published" ? now() : p.verifiedAt } : p
            ),
            notifications: labels[stage]
              ? pushNotification(s, property?.landlordId ?? "landlord", {
                  title: labels[stage]!,
                  body: note ? `${property?.title}: ${note}` : `${property?.title} moved to "${labels[stage]}".`,
                  kind: "verification",
                  href: "/landlord/properties",
                })
              : s.notifications,
          };
        }),

      toggleChecklistItem: (verificationId, itemId) =>
        set((s) => ({
          verifications: s.verifications.map((v) =>
            v.id === verificationId ? { ...v, checklist: v.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) } : v
          ),
        })),

      addVerificationNote: (verificationId, body) =>
        set((s) => ({
          verifications: s.verifications.map((v) =>
            v.id === verificationId ? { ...v, notes: [...v.notes, { id: uid("note"), author: DEMO_ACCOUNTS.admin.name, body, createdAt: now() }] } : v
          ),
        })),

      setDocumentStatus: (verificationId, docId, status) =>
        set((s) => ({
          verifications: s.verifications.map((v) =>
            v.id === verificationId ? { ...v, documents: v.documents.map((d) => (d.id === docId ? { ...d, status } : d)) } : v
          ),
        })),

      setReportStatus: (id, status) => set((s) => ({ reports: s.reports.map((r) => (r.id === id ? { ...r, status } : r)) })),
      setUserStatus: (id, status) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status } : u)) })),

      markAllRead: () =>
        set((s) => (s.userId ? { notifications: { ...s.notifications, [s.userId]: (s.notifications[s.userId] ?? []).map((n) => ({ ...n, read: true })) } } : {})),

      createMaintenanceRequest: (input) => {
        const lease = get().leases.find((l) => l.id === input.leaseId)!;
        const property = get().properties.find((p) => p.id === lease.propertyId);
        const tenant = get().users.find((u) => u.id === lease.tenantId);
        const req: MaintenanceRequest = {
          ...input,
          id: `mr-${Math.floor(1100 + Math.random() * 8900)}`,
          propertyId: lease.propertyId,
          tenantId: lease.tenantId,
          landlordId: property?.landlordId ?? "",
          status: "submitted",
          createdAt: now(),
          updatedAt: now(),
          timeline: [{ id: uid("t"), status: "submitted", label: "Request submitted", by: tenant?.name ?? "Tenant", at: now() }],
        };
        set((s) => ({
          maintenance: [req, ...s.maintenance],
          notifications: notifyMany(s, [
            ["admin", { title: "New repair request", body: `${req.title} Â· ${property?.area}, ${property?.city}`, kind: "maintenance", href: "/admin/maintenance" }],
            [req.landlordId || "landlord", { title: "Tenant reported an issue", body: `${req.title}. renton is investigating.`, kind: "maintenance", href: "/landlord/maintenance" }],
          ]),
        }));
        return req;
      },

      startInvestigation: (id) =>
        set((s) => ({
          maintenance: advanceRequest(s, id, "investigating", "Investigation started", DEMO_ACCOUNTS.admin.name),
          notifications: notifyMany(s, [
            [s.maintenance.find((m) => m.id === id)?.tenantId ?? "tenant", { title: "We're looking into your repair", body: "A renton officer is investigating your request.", kind: "maintenance", href: "/tenant/repairs" }],
          ]),
        })),

      sendInvestigationReport: (id, report) =>
        set((s) => {
          const req = s.maintenance.find((m) => m.id === id);
          return {
            maintenance: advanceRequest(
              s,
              id,
              "awaiting_approval",
              "Report sent to landlord",
              DEMO_ACCOUNTS.admin.name,
              { investigation: { ...report, investigator: DEMO_ACCOUNTS.admin.name, at: now() } },
              `Estimated cost ${formatNaira(report.estimatedCost)}`
            ),
            notifications: notifyMany(s, [
              [req?.landlordId || "landlord", { title: "Repair needs your approval", body: `${req?.title} Â· est. ${formatNaira(report.estimatedCost)}`, kind: "maintenance", href: "/landlord/maintenance" }],
              [req?.tenantId ?? "tenant", { title: "Investigation complete", body: `${req?.title}: report sent to your landlord for approval.`, kind: "maintenance", href: "/tenant/repairs" }],
            ]),
          };
        }),

      decideMaintenance: (id, approved, note) =>
        set((s) => {
          const req = s.maintenance.find((m) => m.id === id);
          return {
            maintenance: advanceRequest(
              s,
              id,
              approved ? "approved" : "declined",
              approved ? "Landlord approved repair" : "Landlord declined repair",
              s.users.find((u) => u.id === req?.landlordId)?.name ?? DEMO_ACCOUNTS.landlord.name,
              { landlordDecision: { approved, note, at: now() } },
              note
            ),
            notifications: notifyMany(s, [
              ["admin", { title: approved ? "Repair approved: dispatch a technician" : "Repair declined by landlord", body: req?.title ?? "", kind: "maintenance", href: "/admin/maintenance" }],
              [
                req?.tenantId ?? "tenant",
                {
                  title: approved ? "Repair approved âœ”" : "Repair update",
                  body: approved ? `${req?.title}: we're assigning a technician.` : `${req?.title}: your landlord declined. ${note ?? ""}`,
                  kind: "maintenance",
                  href: "/tenant/repairs",
                },
              ],
            ]),
          };
        }),

      dispatchTechnician: (id, technicianId, scheduledFor) =>
        set((s) => {
          const req = s.maintenance.find((m) => m.id === id);
          const tech = TECHNICIANS.find((t) => t.id === technicianId);
          const when = formatDate(scheduledFor, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
          return {
            maintenance: advanceRequest(s, id, "in_progress", "Technician dispatched", "renton", { technician: { technicianId, scheduledFor } }, `${tech?.name} Â· ${tech?.company}`),
            notifications: notifyMany(s, [
              [req?.tenantId ?? "tenant", { title: "Technician scheduled", body: `${tech?.name} (${tech?.trade}) will visit ${when}.`, kind: "maintenance", href: "/tenant/repairs" }],
              [req?.landlordId || "landlord", { title: "Technician dispatched", body: `${req?.title} Â· ${tech?.name}, ${when}`, kind: "maintenance", href: "/landlord/maintenance" }],
            ]),
          };
        }),

      completeMaintenance: (id, note) =>
        set((s) => {
          const req = s.maintenance.find((m) => m.id === id);
          const tech = TECHNICIANS.find((t) => t.id === req?.technician?.technicianId);
          return {
            maintenance: advanceRequest(s, id, "completed", "Repair completed", tech?.name ?? "Technician", { completion: { at: now(), note } }, note),
            notifications: notifyMany(s, [
              [req?.tenantId ?? "tenant", { title: "Repair completed ðŸŽ‰", body: `${req?.title}. Please rate the service.`, kind: "maintenance", href: "/tenant/repairs" }],
              [req?.landlordId || "landlord", { title: "Repair completed", body: req?.title ?? "", kind: "maintenance", href: "/landlord/maintenance" }],
            ]),
          };
        }),

      rateMaintenance: (id, rating, comment) =>
        set((s) => ({ maintenance: s.maintenance.map((m) => (m.id === id ? { ...m, tenantFeedback: { rating, comment, at: now() } } : m)) })),

      requestCautionRefund: (leaseId, bank) => {
        const s0 = get();
        const lease = s0.leases.find((l) => l.id === leaseId);
        if (!lease || lease.intent?.decision !== "move_out") return null;
        if (s0.refunds.some((r) => r.leaseId === leaseId)) return null;
        const property = s0.properties.find((p) => p.id === lease.propertyId);
        const paid = s0.invoices.find((i) => i.leaseId === leaseId)?.items.find((i) => i.key === "caution")?.amount;
        const refund: CautionRefund = {
          id: uid("rf"),
          leaseId,
          tenantId: lease.tenantId,
          propertyId: lease.propertyId,
          landlordId: property?.landlordId ?? "",
          amount: paid ?? property?.cautionDeposit ?? 0,
          requestedAt: now(),
          eligibleFrom: refundEligibleFrom(lease.intent),
          bank,
          status: "requested",
        };
        set((s) => ({
          refunds: [refund, ...s.refunds],
          notifications: notifyMany(s, [
            ["admin", { title: "Caution refund requested", body: `${formatNaira(refund.amount)} Â· payable from ${formatDate(refund.eligibleFrom)}.`, kind: "payment", href: "/admin/refunds" }],
            [refund.landlordId || "landlord", { title: "Tenant requested caution refund", body: `${lease.unit}, ${property?.area}. Report any damage to renton before ${formatDate(refund.eligibleFrom)}.`, kind: "payment", href: "/landlord/tenants" }],
          ]),
        }));
        return refund;
      },

      approveCautionRefund: (id, deduction) => {
        const r = get().refunds.find((x) => x.id === id);
        // The 30-day rule is enforced here as well as in the UI.
        if (!r || r.status !== "requested" || !isRefundEligible(r.eligibleFrom)) return false;
        set((s) => ({
          refunds: s.refunds.map((x) => (x.id === id ? { ...x, status: "approved" as const, approvedAt: now(), deduction: deduction && deduction.amount > 0 ? deduction : undefined } : x)),
          notifications: pushNotification(s, r.tenantId, {
            title: "Caution refund approved",
            body: `${formatNaira(r.amount - (deduction?.amount ?? 0))} will be paid to ${r.bank.bankName} ${r.bank.accountNumber}.${deduction?.amount ? ` Deduction: ${deduction.reason}` : ""}`,
            kind: "payment",
            href: "/tenant/home",
          }),
        }));
        return true;
      },

      markRefundPaid: (id) =>
        set((s) => {
          const r = s.refunds.find((x) => x.id === id);
          return {
            refunds: s.refunds.map((x) => (x.id === id ? { ...x, status: "paid" as const, paidAt: now(), payoutReference: `HD-RFD-${Math.floor(100000 + Math.random() * 900000)}` } : x)),
            notifications: r
              ? pushNotification(s, r.tenantId, { title: "Caution refund paid ðŸ’¸", body: `${formatNaira(r.amount - (r.deduction?.amount ?? 0))} has been sent to your account.`, kind: "payment", href: "/tenant/home" })
              : s.notifications,
          };
        }),

      startRentPlan: (leaseId, schedule) => {
        const s0 = get();
        const lease = s0.leases.find((l) => l.id === leaseId);
        if (!lease || lease.status === "ended" || lease.intent?.decision === "move_out") return null;
        // One plan per term: reuse an open plan, and don't reopen a term that's already paid.
        if (currentRentPlan(s0.rentPlans, lease)) return null;
        const property = s0.properties.find((p) => p.id === lease.propertyId);
        const plan: RentPlan = {
          id: uid("rp"),
          leaseId,
          tenantId: lease.tenantId,
          propertyId: lease.propertyId,
          landlordId: property?.landlordId ?? "",
          reference: paymentReference().replace("HD-", "HD-RENT"),
          dueDate: lease.leaseEnd,
          schedule,
          createdAt: now(),
          contributions: [],
          status: "saving",
        };
        set((s) => ({ rentPlans: [plan, ...s.rentPlans] }));
        return plan;
      },

      setRentPlanSchedule: (planId, schedule) => set((s) => ({ rentPlans: s.rentPlans.map((p) => (p.id === planId ? { ...p, schedule } : p)) })),

      submitRentContribution: (planId, receipt) => {
        const s0 = get();
        const plan = s0.rentPlans.find((p) => p.id === planId);
        const lease = s0.leases.find((l) => l.id === plan?.leaseId);
        if (!plan || !lease || plan.status !== "saving") return { ok: false, reason: "This rent plan is closed." };
        if (lease.intent?.decision === "move_out") return { ok: false, reason: "You've given notice to move out, so you can't save towards another term." };
        const { maxNext } = rentPlanProgress(plan, lease);
        const amount = Math.round(receipt.amountPaid);
        if (maxNext <= 0) return { ok: false, reason: "Your rent is fully covered by payments already made or being verified." };
        if (amount > maxNext) return { ok: false, reason: `That's more than the ${formatNaira(maxNext)} left to pay.` };
        // The last installment may be smaller than the minimum so the tenant can finish off the balance.
        if (amount < Math.min(MIN_INSTALLMENT, maxNext)) return { ok: false, reason: `The minimum installment is ${formatNaira(MIN_INSTALLMENT)}.` };
        const property = s0.properties.find((p) => p.id === plan.propertyId);
        const tenant = s0.users.find((u) => u.id === plan.tenantId);
        const c: RentContribution = { id: uid("rc"), amount, status: "submitted", receipt: { ...receipt, amountPaid: amount, uploadedAt: now() } };
        set((s) => ({
          rentPlans: s.rentPlans.map((p) => (p.id === planId ? { ...p, contributions: [...p.contributions, c] } : p)),
          notifications: notifyMany(s, [
            ["admin", { title: "Rent installment to verify", body: `${tenant?.name} paid ${formatNaira(amount)} towards rent for ${property?.title} (ref ${plan.reference}).`, kind: "payment", href: "/admin/rent" }],
          ]),
        }));
        return { ok: true };
      },

      verifyRentContribution: (planId, contributionId) =>
        set((s) => {
          const plan = s.rentPlans.find((p) => p.id === planId);
          const lease = s.leases.find((l) => l.id === plan?.leaseId);
          const c = plan?.contributions.find((x) => x.id === contributionId);
          if (!plan || !lease || c?.status !== "submitted") return {};
          const updated: RentPlan = {
            ...plan,
            contributions: plan.contributions.map((x) =>
              x.id === contributionId ? { ...x, status: "verified" as const, verifiedAt: now(), receiptNumber: `HD-RNT-${Math.floor(100000 + Math.random() * 900000)}` } : x
            ),
          };
          const progress = rentPlanProgress(updated, lease);
          const property = s.properties.find((p) => p.id === plan.propertyId);
          const tenant = s.users.find((u) => u.id === plan.tenantId);
          const items: [Recipient, NewNotification][] = [];
          items.push([
            plan.tenantId,
            progress.funded
              ? { title: "Rent fully paid ðŸŽ‰", body: `You've paid all ${formatNaira(progress.target)}. renton will now pay your landlord.`, kind: "payment", href: "/tenant/payments" }
              : { title: "Installment confirmed", body: `${formatNaira(c.amount)} received. ${formatNaira(progress.remaining)} left to pay by ${formatDate(plan.dueDate)}.`, kind: "payment", href: "/tenant/payments" },
          ]);
          if (progress.funded)
            items.push(["admin", { title: "Rent fully paid: pay the landlord", body: `${tenant?.name} has paid ${formatNaira(progress.target)} for ${property?.title}.`, kind: "payment", href: "/admin/rent" }]);
          return {
            rentPlans: s.rentPlans.map((p) => (p.id === planId ? updated : p)),
            notifications: notifyMany(s, items),
          };
        }),

      rejectRentContribution: (planId, contributionId, reason) =>
        set((s) => {
          const plan = s.rentPlans.find((p) => p.id === planId);
          const c = plan?.contributions.find((x) => x.id === contributionId);
          if (!plan || c?.status !== "submitted") return {};
          return {
            rentPlans: s.rentPlans.map((p) =>
              p.id === planId ? { ...p, contributions: p.contributions.map((x) => (x.id === contributionId ? { ...x, status: "rejected" as const, rejectionReason: reason } : x)) } : p
            ),
            notifications: pushNotification(s, plan.tenantId, { title: "We couldn't verify your installment", body: `${formatNaira(c.amount)}: ${reason}`, kind: "payment", href: "/tenant/payments" }),
          };
        }),

      payOutRentPlan: (planId) => {
        const s0 = get();
        const plan = s0.rentPlans.find((p) => p.id === planId);
        const lease = s0.leases.find((l) => l.id === plan?.leaseId);
        if (!plan || !lease || plan.status !== "saving") return false;
        const progress = rentPlanProgress(plan, lease);
        // Landlords are only paid once the full rent is in renton's account.
        if (!progress.funded) return false;
        const payout = { amount: progress.target, reference: `HD-PAY-${Math.floor(100000 + Math.random() * 900000)}`, at: now(), by: DEMO_ACCOUNTS.admin.name };
        const property = s0.properties.find((p) => p.id === plan.propertyId);
        const tenant = s0.users.find((u) => u.id === plan.tenantId);
        set((s) => ({
          rentPlans: s.rentPlans.map((p) => (p.id === planId ? { ...p, status: "paid_out" as const, payout } : p)),
          leases: s.leases.map((l) => (l.id === plan.leaseId ? { ...l, lastPaymentAt: payout.at } : l)),
          notifications: notifyMany(s, [
            [plan.landlordId, { title: "Rent paid to you ðŸ’¸", body: `${formatNaira(payout.amount)} from ${tenant?.name} for ${property?.title} (term from ${formatDate(plan.dueDate)}). Ref ${payout.reference}.`, kind: "payment", href: "/landlord/tenants" }],
            [plan.tenantId, { title: "Your landlord has been paid", body: `renton sent your ${formatNaira(payout.amount)} rent to your landlord. Ref ${payout.reference}.`, kind: "payment", href: "/tenant/payments" }],
          ]),
        }));
        return true;
      },

      serveRentIncrease: (targets, note) => {
        const served: string[] = [];
        const skipped: { leaseId: string; reason: string }[] = [];
        const s0 = get();
        const reviews = new Map<string, RentReview>();
        for (const t of targets) {
          const lease = s0.leases.find((l) => l.id === t.leaseId);
          if (!lease) continue;
          if (t.newRent <= 0) {
            skipped.push({ leaseId: t.leaseId, reason: "Invalid rent" });
            continue;
          }
          const movedIn = hasMovedIn(lease);
          const notice = canServeRentNotice(lease);
          // Tenants who haven't moved in can't negotiate; notice rule applies to current tenants.
          if (movedIn && !notice.ok) {
            skipped.push({ leaseId: t.leaseId, reason: notice.reason });
            continue;
          }
          const offer = { id: uid("o"), by: "landlord" as const, amount: t.newRent, note, at: now() };
          reviews.set(t.leaseId, {
            id: uid("rr"),
            currentRent: lease.annualRent,
            proposedRent: t.newRent,
            effectiveFrom: lease.leaseEnd,
            noticeServedAt: now(),
            negotiable: movedIn,
            status: movedIn ? "proposed" : "agreed",
            offers: [offer],
            ...(movedIn ? {} : { agreedRent: t.newRent, agreedAt: now() }),
          });
          served.push(t.leaseId);
        }
        const servedLeases = s0.leases.filter((l) => reviews.has(l.id));
        set((s) => ({
          leases: s.leases.map((l) => (reviews.has(l.id) ? { ...l, rentReview: reviews.get(l.id) } : l)),
          notifications: notifyMany(
            s,
            servedLeases.map((l): [Recipient, NewNotification] => {
              const rr = reviews.get(l.id)!;
              return [
                l.tenantId,
                rr.negotiable
                  ? { title: "Rent review notice", body: `Your landlord proposes ${formatNaira(rr.proposedRent)}/yr from ${formatDate(l.leaseEnd)}. You can accept or make a counter-offer.`, kind: "lease", href: "/tenant/home" }
                  : { title: "New rent for your next term", body: `Rent from ${formatDate(l.leaseEnd)} will be ${formatNaira(rr.proposedRent)}/yr.`, kind: "lease", href: "/tenant/home" },
              ];
            })
          ),
        }));
        return { served, skipped };
      },

      applyRentToNewTenants: (propertyId, newRent) => {
        const s0 = get();
        const affected = s0.invoices.filter((i) => i.propertyId === propertyId && (i.status === "awaiting_payment" || i.status === "rejected"));
        set((s) => {
          const property = s.properties.find((p) => p.id === propertyId);
          if (!property) return {};
          const updatedProperty = { ...property, rent: newRent };
          const invoices = s.invoices.map((i) => {
            if (!affected.some((a) => a.id === i.id)) return i;
            const app = s.applications.find((a) => a.id === i.applicationId);
            return { ...i, ...moveInFees(updatedProperty, app?.leaseYears ?? 1) };
          });
          return {
            properties: s.properties.map((p) => (p.id === propertyId ? updatedProperty : p)),
            invoices,
            notifications: notifyMany(
              s,
              affected.map((a): [Recipient, NewNotification] => [
                a.tenantId,
                {
                  title: "Rent updated for your new home",
                  body: `The landlord set the rent for ${property.title} to ${formatNaira(newRent)}/yr. Your move-in total is now ${formatNaira(invoices.find((i) => i.id === a.id)!.total)}.`,
                  kind: "payment",
                  href: "/tenant/payments",
                },
              ])
            ),
          };
        });
        return affected.length;
      },

      tenantRespondRent: (leaseId, response) =>
        set((s) => {
          const lease = s.leases.find((l) => l.id === leaseId);
          const rr = lease?.rentReview;
          if (!lease || !rr || !rr.negotiable || rr.status !== "proposed") return {};
          const tenant = s.users.find((u) => u.id === lease.tenantId);
          const latest = rr.offers[rr.offers.length - 1].amount;
          const next: RentReview =
            "accept" in response
              ? { ...rr, status: "agreed", agreedRent: latest, agreedAt: now() }
              : { ...rr, status: "countered", offers: [...rr.offers, { id: uid("o"), by: "tenant", amount: response.counter, note: response.note, at: now() }] };
          return {
            leases: s.leases.map((l) => (l.id === leaseId ? { ...l, rentReview: next } : l)),
            notifications: notifyMany(s, [
              [
                landlordOf(s, lease.propertyId),
                "accept" in response
                  ? { title: "Rent increase accepted", body: `${tenant?.name} agreed to ${formatNaira(latest)}/yr from ${formatDate(rr.effectiveFrom)}.`, kind: "lease", href: "/landlord/tenants" }
                  : { title: "Tenant made a counter-offer", body: `${tenant?.name} offered ${formatNaira(response.counter)}/yr for ${lease.unit}.`, kind: "lease", href: "/landlord/tenants" },
              ],
            ]),
          };
        }),

      landlordRespondRent: (leaseId, response) =>
        set((s) => {
          const lease = s.leases.find((l) => l.id === leaseId);
          const rr = lease?.rentReview;
          if (!lease || !rr || rr.status === "agreed" || rr.status === "withdrawn") return {};
          const latest = rr.offers[rr.offers.length - 1].amount;
          let next: RentReview;
          let note: NewNotification;
          if ("withdraw" in response) {
            next = { ...rr, status: "withdrawn" };
            note = { title: "Rent increase withdrawn", body: `Your rent stays at ${formatNaira(rr.currentRent)}/yr.`, kind: "lease", href: "/tenant/home" };
          } else if ("acceptCounter" in response) {
            if (rr.status !== "countered") return {};
            next = { ...rr, status: "agreed", agreedRent: latest, agreedAt: now() };
            note = { title: "Landlord accepted your offer ðŸŽ‰", body: `Your new rent is ${formatNaira(latest)}/yr from ${formatDate(rr.effectiveFrom)}.`, kind: "lease", href: "/tenant/home" };
          } else {
            next = { ...rr, status: "proposed", offers: [...rr.offers, { id: uid("o"), by: "landlord", amount: response.counter, note: response.note, at: now() }] };
            note = { title: "New rent offer from your landlord", body: `${formatNaira(response.counter)}/yr from ${formatDate(rr.effectiveFrom)}.`, kind: "lease", href: "/tenant/home" };
          }
          return {
            leases: s.leases.map((l) => (l.id === leaseId ? { ...l, rentReview: next } : l)),
            notifications: pushNotification(s, lease.tenantId, note),
          };
        }),

      setLeaseIntent: (leaseId, intent) =>
        set((s) => {
          const lease = s.leases.find((l) => l.id === leaseId);
          const property = s.properties.find((p) => p.id === lease?.propertyId);
          const tenant = s.users.find((u) => u.id === lease?.tenantId);
          const renew = intent.decision === "renew";
          return {
            leases: s.leases.map((l) => (l.id === leaseId ? { ...l, intent: { ...intent, submittedAt: now() } } : l)),
            notifications: notifyMany(s, [
              [
                landlordOf(s, lease?.propertyId),
                {
                  title: renew ? "Tenant wants to renew" : "Tenant moving out",
                  body: renew
                    ? `${tenant?.name} wants to renew ${lease?.unit}, ${property?.area} for ${intent.renewYears} year${intent.renewYears === 1 ? "" : "s"}.`
                    : `${tenant?.name} will move out of ${lease?.unit}, ${property?.area} on ${formatDate(intent.moveOutDate ?? lease?.leaseEnd ?? now())}.`,
                  kind: "lease",
                  href: "/landlord/tenants",
                },
              ],
            ]),
          };
        }),

      clearLeaseIntent: (leaseId) => set((s) => ({ leases: s.leases.map((l) => (l.id === leaseId ? { ...l, intent: undefined } : l)) })),

      respondToLeaseIntent: (leaseId) =>
        set((s) => {
          const lease = s.leases.find((l) => l.id === leaseId);
          if (!lease?.intent) return {};
          const intent = lease.intent;
          const renew = intent.decision === "renew";
          const newEnd = new Date(lease.leaseEnd);
          if (renew) newEnd.setFullYear(newEnd.getFullYear() + (intent.renewYears ?? 1));
          const tenantNote: NewNotification = renew
            ? { title: "Renewal accepted ðŸŽ‰", body: `Your lease now runs until ${formatDate(newEnd.toISOString())}.`, kind: "lease", href: "/tenant/home" }
            : { title: "Move-out acknowledged", body: "Your landlord confirmed your move-out. We'll schedule a check-out inspection.", kind: "lease", href: "/tenant/home" };
          return {
            leases: s.leases.map((l) =>
              l.id === leaseId
                ? {
                    ...l,
                    intent: { ...intent, landlordResponse: { status: renew ? ("accepted" as const) : ("acknowledged" as const), at: now() } },
                    ...(renew
                      ? {
                          leaseEnd: newEnd.toISOString(),
                          status: "active" as const,
                          annualRent: l.rentReview?.status === "agreed" && l.rentReview.agreedRent ? l.rentReview.agreedRent : l.annualRent,
                        }
                      : {}),
                  }
                : l
            ),
            // A confirmed move-out puts the home back on the market as "available soon".
            properties: renew
              ? s.properties
              : s.properties.map((p) => (p.id === lease.propertyId ? { ...p, occupancy: "available_soon" as const, availableFrom: intent.moveOutDate ?? lease.leaseEnd } : p)),
            notifications: pushNotification(s, lease.tenantId, tenantNote),
          };
        }),

      markRead: (id) =>
        set((s) =>
          s.userId ? { notifications: { ...s.notifications, [s.userId]: (s.notifications[s.userId] ?? []).map((n) => (n.id === id ? { ...n, read: true } : n)) } } : {}
        ),
    }),
    {
      // v5: per-user notification inboxes, credentials and session user id.
      name: STORE_KEY,
      storage: createJSONStorage(() => ({
        getItem: (k) => localStorage.getItem(k),
        removeItem: (k) => localStorage.removeItem(k),
        setItem: (k, v) => {
          try {
            localStorage.setItem(k, v);
          } catch (e) {
            console.warn("renton demo: could not persist state (storage full?)", e);
          }
        },
      })),
      skipHydration: true,
    }
  )
);

/** Hydration flag so client-only UI can render skeletons until localStorage is loaded. */
export const useHydration = create<{ hydrated: boolean; setHydrated: () => void }>((set) => ({
  hydrated: false,
  setHydrated: () => set({ hydrated: true }),
}));

/** The signed-in user record, or null. */
export const selectCurrentUser = (s: Pick<AppState, "users" | "userId">) => (s.userId ? (s.users.find((u) => u.id === s.userId) ?? null) : null);


