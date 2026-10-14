import type {
  Activity,
  Application,
  ChecklistItem,
  Lease,
  MessageThread,
  Notification,
  Report,
  VerificationRequest,
  WaitingList,
} from "renton-shared/types";
import { daysAgo, daysAhead } from "./properties";

const hoursAgo = (h: number) => new Date(Date.UTC(2026, 9, 6, 9) - h * 3_600_000).toISOString();

// â”€â”€â”€ Applications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const APPLICATIONS: Application[] = [
  {
    id: "app-1001",
    propertyId: "p-lek-001",
    tenantId: "u-tenant-1",
    status: "pending",
    submittedAt: daysAgo(2),
    updatedAt: daysAgo(1),
    moveInDate: daysAhead(21),
    leaseYears: 1,
    message: "Hi, I work remotely for Paystack and I'm looking for a quiet place close to the Lekki toll gate. I can pay a full year upfront.",
    documents: ["Employment letter.pdf", "3-month bank statement.pdf", "NIN slip.pdf"],
  },
  {
    id: "app-1002",
    propertyId: "p-wus-010",
    tenantId: "u-tenant-1",
    status: "approved",
    submittedAt: daysAgo(330),
    updatedAt: daysAgo(322),
    moveInDate: daysAgo(310),
    leaseYears: 1,
    message: "Relocating to Abuja for a new role. Very interested in a 2-year lease.",
    documents: ["Employment letter.pdf", "NIN slip.pdf", "Guarantor form.pdf"],
    landlordNote: "Lovely application â€” welcome! Please book an inspection for key handover.",
    invoiceId: "inv-2001",
  },
  {
    id: "app-1003",
    propertyId: "p-vi-006",
    tenantId: "u-tenant-1",
    status: "rejected",
    submittedAt: daysAgo(25),
    updatedAt: daysAgo(19),
    moveInDate: daysAgo(5),
    leaseYears: 1,
    message: "Interested in the serviced apartment for a 1-year stay.",
    documents: ["Employment letter.pdf"],
    landlordNote: "Thank you for applying. The unit was let to an earlier applicant who could move in sooner.",
  },
  {
    id: "app-1004",
    propertyId: "p-yab-003",
    tenantId: "u-tenant-1",
    status: "pending",
    submittedAt: hoursAgo(20),
    updatedAt: hoursAgo(20),
    moveInDate: daysAhead(30),
    leaseYears: 1,
    message: "Backup option close to my co-working space in Yaba.",
    documents: ["NIN slip.pdf", "Employment letter.pdf"],
  },
  // Applications on landlord-1's listings
  {
    id: "app-1005",
    propertyId: "p-gra-014",
    tenantId: "u-tenant-4",
    status: "pending",
    submittedAt: hoursAgo(5),
    updatedAt: hoursAgo(5),
    moveInDate: daysAhead(14),
    leaseYears: 2,
    message: "Family of four relocating within PH. Employer can provide a corporate guarantee.",
    documents: ["Employer letter.pdf", "Corporate guarantee.pdf", "NIN slip.pdf"],
  },
  {
    id: "app-1006",
    propertyId: "p-lek-001",
    tenantId: "u-tenant-2",
    status: "pending",
    submittedAt: daysAgo(1),
    updatedAt: daysAgo(1),
    moveInDate: daysAhead(30),
    leaseYears: 1,
    message: "Hello! We're a young family looking for a safe estate with a pool for the kids.",
    documents: ["Employment letter.pdf", "Bank statement.pdf"],
  },
  {
    id: "app-1007",
    propertyId: "p-ogr-017",
    tenantId: "u-tenant-6",
    status: "approved",
    submittedAt: daysAgo(9),
    updatedAt: daysAgo(4),
    moveInDate: daysAhead(7),
    leaseYears: 1,
    message: "I'm doing a residency rotation in PH for a year.",
    documents: ["Employment letter.pdf", "NIN slip.pdf"],
  },
  {
    id: "app-1008",
    propertyId: "p-wus-010",
    tenantId: "u-tenant-3",
    status: "rejected",
    submittedAt: daysAgo(14),
    updatedAt: daysAgo(6),
    moveInDate: daysAhead(10),
    leaseYears: 1,
    message: "Looking for something close to my office in the CBD.",
    documents: ["Employment letter.pdf"],
  },
  {
    id: "app-1009",
    propertyId: "p-gra-014",
    tenantId: "u-tenant-3",
    status: "approved",
    submittedAt: daysAgo(6),
    updatedAt: daysAgo(3),
    moveInDate: daysAhead(25),
    leaseYears: 1,
    message: "I'm relocating to Port Harcourt for work at the end of the month and would love a quiet, secure home in GRA.",
    documents: ["Employment letter.pdf", "NIN slip.pdf", "Bank statement.pdf"],
    landlordNote: "Approved. Welcome to GRA Phase 2!",
    invoiceId: "inv-2002",
  },
];

// â”€â”€â”€ Waiting lists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const WAITING_LISTS: WaitingList[] = [
  {
    id: "wl-1",
    tenantId: "u-tenant-1",
    city: "Lagos",
    areas: ["Lekki Phase 1", "Victoria Island"],
    propertyType: "Apartment",
    bedrooms: 2,
    minBudget: 4_000_000,
    maxBudget: 10_000_000,
    moveIn: "Within 1 month",
    status: "active",
    createdAt: daysAgo(18),
  },
  {
    id: "wl-2",
    tenantId: "u-tenant-1",
    city: "Abuja",
    areas: ["Wuse 2", "Jabi"],
    propertyType: "Apartment",
    bedrooms: 3,
    minBudget: 5_000_000,
    maxBudget: 9_000_000,
    moveIn: "1-3 months",
    status: "matched",
    createdAt: daysAgo(40),
  },
];

// â”€â”€â”€ Leases (landlord-1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const LEASES: Lease[] = [
  { id: "ls-1", propertyId: "p-ikj-004", tenantId: "u-tenant-2", unit: "Unit A", leaseStart: daysAgo(200), leaseEnd: daysAhead(165), annualRent: 14_000_000, status: "active", lastPaymentAt: daysAgo(200) },
  {
    id: "ls-2",
    propertyId: "p-jab-013",
    tenantId: "u-tenant-3",
    unit: "Block 2, Unit 4",
    leaseStart: daysAgo(340),
    leaseEnd: daysAhead(25),
    annualRent: 9_000_000,
    status: "expiring",
    lastPaymentAt: daysAgo(340),
    intent: { decision: "move_out", submittedAt: daysAgo(4), moveOutDate: daysAhead(25), reason: "Relocating for work", note: "Happy to allow viewings on weekends." },
  },
  // Tamuno gave notice 45 days ago and moved out; their caution refund is now payable.
  {
    id: "ls-3",
    propertyId: "p-gra-014",
    tenantId: "u-tenant-4",
    unit: "Main House",
    leaseStart: daysAgo(380),
    leaseEnd: daysAgo(15),
    annualRent: 8_000_000,
    status: "ended",
    lastPaymentAt: daysAgo(380),
    intent: { decision: "move_out", submittedAt: daysAgo(45), moveOutDate: daysAgo(15), reason: "Buying my own home", landlordResponse: { status: "acknowledged", at: daysAgo(44) } },
  },
  { id: "ls-4", propertyId: "p-ogr-017", tenantId: "u-tenant-6", unit: "Flat 1", leaseStart: daysAgo(90), leaseEnd: daysAhead(275), annualRent: 4_200_000, status: "active", lastPaymentAt: daysAgo(90) },
  // The demo tenant's current home: ~10 months in, so the renewal decision is live.
  {
    id: "ls-5",
    propertyId: "p-wus-010",
    tenantId: "u-tenant-1",
    unit: "Flat 3B",
    leaseStart: daysAgo(310),
    leaseEnd: daysAhead(55),
    annualRent: 8_500_000,
    status: "expiring",
    lastPaymentAt: daysAgo(310),
    // Served 95 days before expiry (â‰¥ 3 months), so negotiation is open.
    rentReview: {
      id: "rr-1",
      currentRent: 8_500_000,
      proposedRent: 9_350_000,
      effectiveFrom: daysAhead(55),
      noticeServedAt: daysAgo(40),
      negotiable: true,
      status: "proposed",
      offers: [
        {
          id: "o1",
          by: "landlord",
          amount: 9_350_000,
          note: "Rents for comparable 3-bed flats in Wuse 2 have risen about 15% this year. I'm proposing 10% to keep things fair.",
          at: daysAgo(40),
        },
      ],
    },
  },
  { id: "ls-6", propertyId: "p-lek-001", tenantId: "u-tenant-7", unit: "Flat 2A", leaseStart: daysAgo(730), leaseEnd: daysAgo(365), annualRent: 8_000_000, status: "ended", lastPaymentAt: daysAgo(730) },
];

// â”€â”€â”€ Verification queue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const DEFAULT_CHECKLIST: Omit<ChecklistItem, "done">[] = [
  { id: "ck-title", label: "Title document authenticated", description: "C of O / Deed cross-checked with state land registry" },
  { id: "ck-owner", label: "Owner identity confirmed", description: "NIN / passport matches title holder or valid POA" },
  { id: "ck-address", label: "Address geo-verified", description: "Field officer confirmed GPS location matches listing" },
  { id: "ck-photos", label: "Photos match property", description: "Listing photos taken at this address, no stock imagery" },
  { id: "ck-utilities", label: "Utilities tested", description: "Water, power and plumbing working as described" },
  { id: "ck-pricing", label: "Pricing within market range", description: "Rent within Â±25% of comparable verified listings" },
  { id: "ck-encumbrance", label: "No disputes or encumbrances", description: "No pending litigation, family or community claims" },
];

const checklist = (doneCount: number): ChecklistItem[] => DEFAULT_CHECKLIST.map((c, i) => ({ ...c, done: i < doneCount }));

export const VERIFICATIONS: VerificationRequest[] = [
  {
    id: "vr-501",
    propertyId: "p-lek-025",
    submittedAt: daysAgo(6),
    stage: "under_review",
    priority: "high",
    inspector: "Segun Adebayo",
    inspectionDate: daysAgo(2),
    documents: [
      { id: "d1", name: "Certificate_of_Occupancy_Lekki.pdf", kind: "C of O", uploadedAt: daysAgo(6), sizeKb: 2310, status: "verified" },
      { id: "d2", name: "Survey_Plan_LK-4471.pdf", kind: "Survey Plan", uploadedAt: daysAgo(6), sizeKb: 1480, status: "verified" },
      { id: "d3", name: "Owner_Passport.jpg", kind: "Owner ID", uploadedAt: daysAgo(6), sizeKb: 640, status: "verified" },
      { id: "d4", name: "Power_of_Attorney_Signed.pdf", kind: "Power of Attorney", uploadedAt: daysAgo(5), sizeKb: 890, status: "pending" },
      { id: "d5", name: "EKEDC_Bill_Sept.pdf", kind: "Utility Bill", uploadedAt: daysAgo(5), sizeKb: 220, status: "verified" },
    ],
    checklist: checklist(4),
    notes: [
      { id: "n1", author: "Segun Adebayo", body: "Site inspection done. Building matches photos; borehole and treatment plant working. Generator house is shared with the next block.", createdAt: daysAgo(2) },
      { id: "n2", author: "Ibrahim Lawal", body: "Owner is diaspora (UK). Waiting on notarised POA for the local caretaker before we can sign off.", createdAt: daysAgo(1) },
    ],
    riskFlags: [],
  },
  {
    id: "vr-502",
    propertyId: "p-asb-029",
    submittedAt: daysAgo(5),
    stage: "under_review",
    priority: "normal",
    inspector: "Hauwa Garba",
    inspectionDate: daysAgo(1),
    documents: [
      { id: "d1", name: "Deed_of_Assignment.pdf", kind: "Deed of Assignment", uploadedAt: daysAgo(5), sizeKb: 3120, status: "verified" },
      { id: "d2", name: "AGIS_Search_Report.pdf", kind: "Governor's Consent", uploadedAt: daysAgo(5), sizeKb: 1210, status: "pending" },
      { id: "d3", name: "Owner_NIN.jpg", kind: "Owner ID", uploadedAt: daysAgo(5), sizeKb: 410, status: "verified" },
    ],
    checklist: checklist(3),
    notes: [{ id: "n1", author: "Hauwa Garba", body: "Asking rent is ~18% above comparables in Asokoro; within tolerance.", createdAt: daysAgo(1) }],
    riskFlags: ["Rent above area median"],
  },
  {
    id: "vr-503",
    propertyId: "p-tra-026",
    submittedAt: daysAgo(3),
    stage: "inspection_scheduled",
    priority: "normal",
    inspector: "Chukwudi Obi",
    inspectionDate: daysAhead(2),
    documents: [
      { id: "d1", name: "C_of_O_Enugu.pdf", kind: "C of O", uploadedAt: daysAgo(3), sizeKb: 1980, status: "pending" },
      { id: "d2", name: "Owner_Passport.jpg", kind: "Owner ID", uploadedAt: daysAgo(3), sizeKb: 520, status: "verified" },
    ],
    checklist: checklist(1),
    notes: [],
    riskFlags: [],
  },
  {
    id: "vr-504",
    propertyId: "p-kat-027",
    submittedAt: daysAgo(1),
    stage: "submitted",
    priority: "high",
    documents: [
      { id: "d1", name: "Building_Approval_FCDA.pdf", kind: "Building Approval", uploadedAt: daysAgo(1), sizeKb: 2650, status: "pending" },
      { id: "d2", name: "Deed_of_Assignment.pdf", kind: "Deed of Assignment", uploadedAt: daysAgo(1), sizeKb: 2980, status: "pending" },
      { id: "d3", name: "Owner_Passport.jpg", kind: "Owner ID", uploadedAt: daysAgo(1), sizeKb: 530, status: "pending" },
    ],
    checklist: checklist(0),
    notes: [],
    riskFlags: [],
  },
  {
    id: "vr-505",
    propertyId: "p-she-030",
    submittedAt: daysAgo(2),
    stage: "submitted",
    priority: "low",
    documents: [
      { id: "d1", name: "Survey_Plan.jpg", kind: "Survey Plan", uploadedAt: daysAgo(2), sizeKb: 1840, status: "flagged" },
      { id: "d2", name: "Owner_ID.jpg", kind: "Owner ID", uploadedAt: daysAgo(2), sizeKb: 300, status: "pending" },
    ],
    checklist: checklist(0),
    notes: [{ id: "n1", author: "System", body: "Survey plan image resolution is low; surveyor's seal is not legible.", createdAt: daysAgo(2) }],
    riskFlags: ["Landlord identity not yet verified", "Low-quality title document"],
  },
];

// â”€â”€â”€ Reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const REPORTS: Report[] = [
  { id: "r-901", category: "fraud", subject: "Fake agent requesting inspection fee", subjectId: "ext-0815", reason: "Off-platform payment request", details: "A caller claiming to represent a renton landlord asked for a â‚¦20,000 inspection fee via bank transfer to a personal account.", reportedBy: "Chiamaka Eze", severity: "critical", status: "investigating", createdAt: hoursAgo(3) },
  { id: "r-902", category: "fraud", subject: "Duplicate listing using stolen photos", subjectId: "ext-2207", reason: "Image theft", details: "Photos from a verified Lekki listing reposted on social media with a different phone number and a lower price.", reportedBy: "Funmilayo Ogunleye", severity: "high", status: "open", createdAt: hoursAgo(26) },
  { id: "r-903", category: "property", subject: "3-Bedroom Flat off Sapele Road", subjectId: "p-sap-024", reason: "Amenities misrepresented", details: "Listing says borehole, but tenant reports the borehole has been non-functional for 3 months.", reportedBy: "Efe Omoregie", severity: "medium", status: "open", createdAt: daysAgo(2) },
  { id: "r-904", category: "property", subject: "Budget Self Contain, Osongama", subjectId: "p-osn-021", reason: "Already occupied", details: "Visited for viewing and found the unit occupied; caretaker said it was let two weeks ago.", reportedBy: "Daniel Akpan", severity: "low", status: "resolved", createdAt: daysAgo(6) },
  { id: "r-905", category: "user", subject: "Zainab Yusuf", subjectId: "u-tenant-8", reason: "Forged employment letter", details: "Landlord flagged an employment letter with inconsistent letterhead and an unreachable HR contact.", reportedBy: "Alhaji Musa Danjuma", severity: "high", status: "investigating", createdAt: daysAgo(3) },
  { id: "r-906", category: "user", subject: "Emem Udoh", subjectId: "u-landlord-6", reason: "Unresponsive landlord", details: "Approved application 2 weeks ago, but landlord has not responded to messages about key handover.", reportedBy: "Kelechi Okoro", severity: "medium", status: "open", createdAt: daysAgo(4) },
  { id: "r-907", category: "fraud", subject: "Phishing link in chat", subjectId: "ext-3301", reason: "Suspicious link", details: "User received a chat message with a link to a fake renton payment page.", reportedBy: "Aisha Bello", severity: "critical", status: "resolved", createdAt: daysAgo(9) },
];

// â”€â”€â”€ Notifications & activity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const NOTIFICATIONS: Record<"tenant" | "landlord" | "admin", Notification[]> = {
  tenant: [
    { id: "nt-1", title: "New 92% match in Lekki Phase 1", body: "A verified 3-bedroom apartment fits your waiting list.", kind: "match", createdAt: hoursAgo(1), read: false, href: "/properties/p-lek-001" },
    { id: "nt-2", title: "Your lease ends in 55 days", body: "Let your landlord know if you'll renew or move out.", kind: "lease", createdAt: hoursAgo(2), read: false, href: "/tenant/home" },
    { id: "nt-5", title: "Technician scheduled", body: "A plumber will fix your kitchen sink leak tomorrow at 10:00am.", kind: "maintenance", createdAt: hoursAgo(6), read: false, href: "/tenant/repairs" },
    { id: "nt-3", title: "New message from Ngozi Adeyemi", body: "Happy to schedule a virtual tour this Saturday.", kind: "message", createdAt: hoursAgo(5), read: false, href: "/tenant/messages" },
    { id: "nt-4", title: "Complete your profile", body: "Add a guarantor to stand out to landlords.", kind: "system", createdAt: daysAgo(3), read: true, href: "/tenant/profile" },
  ],
  landlord: [
    { id: "nl-1", title: "New application received", body: "Tamuno Briggs applied for Elegant 4-Bedroom Duplex in GRA Phase 2.", kind: "application", createdAt: hoursAgo(5), read: false, href: "/landlord/applications" },
    { id: "nl-2", title: "Inspection scheduled", body: "Field inspection for Trans-Ekulu flat set for Thursday, 10:00am.", kind: "verification", createdAt: daysAgo(1), read: false, href: "/landlord/properties" },
    { id: "nl-5", title: "Repair needs your approval", body: "Bedroom AC not cooling Â· Flat 3B, Wuse 2 Â· est. â‚¦85,000", kind: "maintenance", createdAt: hoursAgo(4), read: false, href: "/landlord/maintenance" },
    { id: "nl-6", title: "Tenant moving out", body: "Aisha Bello will move out of Block 2, Unit 4, Jabi at the end of the lease.", kind: "lease", createdAt: daysAgo(4), read: false, href: "/landlord/tenants" },
    { id: "nl-3", title: "Rent overdue", body: "Lease for GRA Phase 2 duplex expired 15 days ago with no renewal.", kind: "payment", createdAt: daysAgo(2), read: false, href: "/landlord/tenants" },
    { id: "nl-4", title: "Listing verified âœ”", body: "Classic 3-Bedroom Bungalow in Old GRA is now live.", kind: "verification", createdAt: daysAgo(8), read: true },
  ],
  admin: [
    { id: "na-1", title: "Critical fraud report", body: "Off-platform inspection fee request reported in Lagos.", kind: "system", createdAt: hoursAgo(3), read: false, href: "/admin/reports" },
    { id: "na-2", title: "2 new verification submissions", body: "Katampe terrace and Shelter Afrique bungalow are awaiting triage.", kind: "verification", createdAt: daysAgo(1), read: false, href: "/admin/verifications" },
    { id: "na-4", title: "New repair request", body: "Generator not starting Â· Ikeja GRA duplex (Unit A).", kind: "maintenance", createdAt: hoursAgo(9), read: false, href: "/admin/maintenance" },
    { id: "na-3", title: "Inspection report uploaded", body: "Segun Adebayo submitted the Chevron Drive inspection.", kind: "verification", createdAt: daysAgo(2), read: true, href: "/admin/verifications/vr-501" },
  ],
};

export const TENANT_ACTIVITY: Activity[] = [
  { id: "a1", label: "Applied to Modern Mini Flat near UNILAG", detail: "Yaba, Lagos", kind: "applied", createdAt: hoursAgo(20) },
  { id: "a2", label: "Saved Executive 2-Bedroom Serviced Apartment", detail: "Victoria Island, Lagos", kind: "saved", createdAt: daysAgo(1) },
  { id: "a3", label: "New match on your Lagos waiting list", detail: "92% match Â· Lekki Phase 1", kind: "waitlist", createdAt: daysAgo(1) },
  { id: "a4", label: "Message from Ngozi Adeyemi", detail: "Re: Serene 3-Bedroom Apartment", kind: "message", createdAt: daysAgo(2) },
  { id: "a5", label: "Repair approved by landlord", detail: "Kitchen sink leak Â· Flat 3B, Wuse 2", kind: "approved", createdAt: daysAgo(1) },
];

export const LANDLORD_ACTIVITY: Activity[] = [
  { id: "l1", label: "New application from Tamuno Briggs", detail: "Elegant 4-Bedroom Duplex Â· GRA Phase 2", kind: "applied", createdAt: hoursAgo(5) },
  { id: "l2", label: "Inspection scheduled", detail: "Executive 3-Bedroom Flat, Trans-Ekulu", kind: "verification", createdAt: daysAgo(1) },
  { id: "l3", label: "Listing submitted for verification", detail: "4-Bedroom Smart Terrace, Katampe", kind: "listing", createdAt: daysAgo(1) },
  { id: "l4", label: "Rent received â‚¦8,500,000", detail: "Flat 3B Â· Wuse 2", kind: "payment", createdAt: daysAgo(310) },
];

// â”€â”€â”€ Messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const THREADS: MessageThread[] = [
  {
    id: "t1",
    withName: "Ngozi Adeyemi",
    withRole: "landlord",
    propertyId: "p-lek-001",
    lastMessage: "Happy to schedule a virtual tour this Saturday.",
    updatedAt: hoursAgo(5),
    unread: 1,
    messages: [
      { id: "m1", fromMe: true, body: "Good afternoon! Is the Lekki apartment still available for November?", at: daysAgo(1) },
      { id: "m2", fromMe: false, body: "Hi Chiamaka, yes it is. I'm based in London but my caretaker can show you around.", at: hoursAgo(8) },
      { id: "m3", fromMe: false, body: "Happy to schedule a virtual tour this Saturday.", at: hoursAgo(5) },
    ],
  },
  {
    id: "t2",
    withName: "Alhaji Musa Danjuma",
    withRole: "landlord",
    propertyId: "p-mai-009",
    lastMessage: "The BQ has its own entrance and meter.",
    updatedAt: daysAgo(3),
    unread: 0,
    messages: [
      { id: "m1", fromMe: true, body: "Does the boys' quarters have a separate meter?", at: daysAgo(3) },
      { id: "m2", fromMe: false, body: "The BQ has its own entrance and meter.", at: daysAgo(3) },
    ],
  },
  {
    id: "t3",
    withName: "renton Support",
    withRole: "admin",
    lastMessage: "Your identity verification is complete âœ”",
    updatedAt: daysAgo(9),
    unread: 0,
    messages: [{ id: "m1", fromMe: false, body: "Your identity verification is complete âœ”", at: daysAgo(9) }],
  },
];

// â”€â”€â”€ Marketing content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export { hoursAgo };


