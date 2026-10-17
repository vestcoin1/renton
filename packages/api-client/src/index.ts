/**
 * Typed client for renton-api. One method per endpoint, grouped by who uses it; responses are the
 * renton-shared domain types the apps already render.
 *
 *   const api = createApiClient({ baseUrl: process.env.NEXT_PUBLIC_API_URL!, getToken: () => session?.access_token });
 *   const { items } = await api.properties.search({ city: "Lagos", bedrooms: 2 });
 *
 * Failed requests throw ApiClientError with the API's stable `code` (e.g. "refund_not_eligible").
 */
import { filtersToParams } from "renton-core/search";
import type {
  Application,
  CautionRefund,
  IdentityDocument,
  IdentityVerification,
  LandlordProfile,
  Lease,
  LeaseIntent,
  MaintenanceRequest,
  MatchResult,
  MessageThread,
  Notification,
  PaymentInvoice,
  PaymentReceiptUpload,
  Property,
  RentPlan,
  Report,
  SearchFilters,
  Technician,
  TenantProfile,
  User,
  UserRole,
  VerificationRequest,
  VerificationStage,
  WaitingList,
} from "renton-shared/types";
import type { CityInfo } from "renton-shared/reference";

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface ApiClientOptions {
  /** e.g. https://api.renton.ng (no trailing /v1). */
  baseUrl: string;
  /** Current Supabase access token (or a dev token); null when signed out. */
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
  fetch?: typeof fetch;
}

type AnyUser = User | TenantProfile | LandlordProfile;
type Items<T> = { items: T[] };
type Page<T> = Items<T> & { total: number; page: number; pageSize: number };
type Receipt = Omit<PaymentReceiptUpload, "uploadedAt">;
type NewListing = Omit<Property, "id" | "landlordId" | "listedAt" | "views" | "verification" | "occupancy" | "nearby" | "state" | "featured" | "verifiedAt"> & {
  documents?: { name: string; kind: VerificationRequest["documents"][number]["kind"]; sizeKb: number; url: string }[];
};
type UploadPurpose = "identity" | "receipt" | "maintenance" | "property_image" | "verification_document";
type Ok = { ok: true };

export function createApiClient(opts: ApiClientOptions) {
  const base = opts.baseUrl.replace(/\/$/, "");
  const doFetch = opts.fetch ?? globalThis.fetch.bind(globalThis);

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await opts.getToken?.();
    const res = await doFetch(`${base}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const e = json?.error ?? {};
      throw new ApiClientError(res.status, e.code ?? "http_error", e.message ?? res.statusText, e.details, e.requestId);
    }
    return json as T;
  }
  const get = <T>(p: string) => request<T>("GET", p);
  const post = <T>(p: string, b: unknown = {}) => request<T>("POST", p, b);
  const put = <T>(p: string, b: unknown = {}) => request<T>("PUT", p, b);
  const patch = <T>(p: string, b: unknown) => request<T>("PATCH", p, b);
  const del = <T>(p: string) => request<T>("DELETE", p);
  const qs = (params: Record<string, string | number | boolean | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
    const s = sp.toString();
    return s ? `?${s}` : "";
  };

  return {
    me: {
      get: () => get<{ user: AnyUser }>("/v1/me"),
      /** Finish sign-up after supabase.auth.signUp. */
      create: (input: { role: "tenant" | "landlord"; name: string; phone?: string; city: string }) => post<{ user: AnyUser }>("/v1/me", input),
      update: (input: {
        name?: string;
        phone?: string;
        city?: string;
        avatarHue?: number;
        tenant?: Partial<Pick<TenantProfile, "occupation" | "employer" | "employmentType" | "monthlyIncome" | "maritalStatus" | "householdSize">> & { guarantor?: string | null };
        landlord?: { company?: string | null; isDiaspora?: boolean; residence?: string };
      }) => patch<{ user: AnyUser }>("/v1/me", input),
      submitIdentity: (input: Pick<IdentityVerification, "idType" | "idNumber"> & { documents: Omit<IdentityDocument, "uploadedAt">[] }) =>
        post<{ user: AnyUser }>("/v1/me/identity", input),
    },

    uploads: {
      create: (input: { purpose: UploadPurpose; fileName: string; contentType: string; sizeBytes: number }) =>
        post<{ ref: string; uploadUrl: string; method: "PUT"; headers: Record<string, string> }>("/v1/uploads", input),
      /** Signs, uploads the file straight to storage, and returns the `ref` to attach to a record. */
      async uploadFile(purpose: UploadPurpose, file: Blob & { name?: string }) {
        const slot = await post<{ ref: string; uploadUrl: string; headers: Record<string, string> }>("/v1/uploads", {
          purpose,
          fileName: file.name ?? "upload",
          contentType: file.type,
          sizeBytes: file.size,
        });
        const res = await doFetch(slot.uploadUrl, { method: "PUT", headers: slot.headers, body: file });
        if (!res.ok) throw new ApiClientError(res.status, "upload_failed", "The file couldn't be uploaded. Try again.");
        return slot.ref;
      },
    },

    notifications: {
      list: (opts: { unread?: boolean; limit?: number } = {}) => get<Items<Notification> & { unreadCount: number }>(`/v1/notifications${qs({ unread: opts.unread, limit: opts.limit })}`),
      markRead: (id: string) => post<Ok>(`/v1/notifications/${id}/read`),
      markAllRead: () => post<{ updated: number }>("/v1/notifications/read-all"),
    },

    properties: {
      /** Same filters (and URL parameter names) as the web search page. */
      search: (filters: SearchFilters = {}, page = 1, pageSize = 24) => {
        const sp = filtersToParams(filters);
        sp.set("page", String(page));
        sp.set("pageSize", String(pageSize));
        return get<Page<Property>>(`/v1/properties?${sp}`);
      },
      featured: (limit?: number) => get<Items<Property>>(`/v1/properties/featured${qs({ limit })}`),
      get: (id: string) => get<{ property: Property; landlord: AnyUser }>(`/v1/properties/${id}`),
      similar: (id: string, limit?: number) => get<Items<Property>>(`/v1/properties/${id}/similar${qs({ limit })}`),
    },
    cities: () => get<Items<CityInfo & { slug: string; listings: number }>>("/v1/cities"),
    landlords: { get: (id: string) => get<{ landlord: LandlordProfile; properties: Property[] }>(`/v1/landlords/${id}`) },

    saved: {
      list: () => get<Items<Property>>("/v1/me/saved"),
      add: (propertyId: string) => put<{ saved: true }>(`/v1/me/saved/${propertyId}`),
      remove: (propertyId: string) => del<{ saved: false }>(`/v1/me/saved/${propertyId}`),
    },

    threads: {
      list: () => get<Items<MessageThread & { withId: string }> & { unread: number }>("/v1/threads"),
      get: (id: string) => get<{ thread: MessageThread & { withId: string } }>(`/v1/threads/${id}`),
      /** Omit recipientId and propertyId to reach renton support. */
      start: (input: { recipientId?: string; propertyId?: string; body: string }) => post<{ thread: MessageThread & { withId: string } }>("/v1/threads", input),
      send: (id: string, body: string) => post<{ thread: MessageThread & { withId: string } }>(`/v1/threads/${id}/messages`, { body }),
      markRead: (id: string) => post<Ok>(`/v1/threads/${id}/read`),
    },

    reports: {
      create: (input: Pick<Report, "category" | "subject" | "subjectId" | "reason" | "details">) => post<{ report: Report }>("/v1/reports", input),
    },

    /** Everything the tenancy agreement and receipt PDFs need. */
    invoices: {
      get: (id: string) => get<{ invoice: PaymentInvoice; lease: Lease | null; property: Property; tenant: AnyUser; landlord: AnyUser }>(`/v1/invoices/${id}`),
    },

    tenant: {
      tenancy: () =>
        get<{ leases: Lease[]; invoices: PaymentInvoice[]; refunds: CautionRefund[]; rentPlans: RentPlan[]; properties: Property[]; landlords: AnyUser[] }>("/v1/tenant/tenancy"),
      applications: {
        list: () => get<Items<Application> & { properties: Property[] }>("/v1/tenant/applications"),
        create: (input: Pick<Application, "propertyId" | "moveInDate" | "leaseYears" | "message" | "documents">) => post<{ application: Application }>("/v1/tenant/applications", input),
        withdraw: (id: string) => del<Ok>(`/v1/tenant/applications/${id}`),
      },
      waitingLists: {
        list: () => get<Items<WaitingList>>("/v1/tenant/waiting-lists"),
        create: (input: Omit<WaitingList, "id" | "tenantId" | "status" | "createdAt">) => post<{ waitingList: WaitingList }>("/v1/tenant/waiting-lists", input),
        setStatus: (id: string, status: WaitingList["status"]) => patch<{ waitingList: WaitingList }>(`/v1/tenant/waiting-lists/${id}`, { status }),
        remove: (id: string) => del<Ok>(`/v1/tenant/waiting-lists/${id}`),
        matches: (id: string, limit?: number) => get<Items<{ property: Property; match: MatchResult }>>(`/v1/tenant/waiting-lists/${id}/matches${qs({ limit })}`),
      },
      submitReceipt: (invoiceId: string, receipt: Receipt) => post<{ invoice: PaymentInvoice }>(`/v1/tenant/invoices/${invoiceId}/receipt`, receipt),
      setLeaseIntent: (leaseId: string, intent: Omit<LeaseIntent, "submittedAt" | "landlordResponse">) => put<{ lease: Lease }>(`/v1/tenant/leases/${leaseId}/intent`, intent),
      clearLeaseIntent: (leaseId: string) => del<{ lease: Lease }>(`/v1/tenant/leases/${leaseId}/intent`),
      respondRent: (leaseId: string, response: { accept: true } | { counter: number; note?: string }) =>
        post<{ lease: Lease }>(`/v1/tenant/leases/${leaseId}/rent-review/respond`, response),
      requestRefund: (leaseId: string, bank: CautionRefund["bank"]) => post<{ refund: CautionRefund }>(`/v1/tenant/leases/${leaseId}/refund`, bank),
      startRentPlan: (leaseId: string, schedule: RentPlan["schedule"]) => post<{ rentPlan: RentPlan }>(`/v1/tenant/leases/${leaseId}/rent-plan`, { schedule }),
      setRentPlanSchedule: (planId: string, schedule: RentPlan["schedule"]) => patch<{ rentPlan: RentPlan }>(`/v1/tenant/rent-plans/${planId}`, { schedule }),
      addInstallment: (planId: string, receipt: Receipt) => post<{ rentPlan: RentPlan }>(`/v1/tenant/rent-plans/${planId}/contributions`, receipt),
      maintenance: {
        list: () => get<Items<MaintenanceRequest> & { properties: Property[]; leases: Lease[] }>("/v1/tenant/maintenance"),
        create: (input: Pick<MaintenanceRequest, "leaseId" | "title" | "category" | "location" | "description" | "urgency"> & { media: Omit<MaintenanceRequest["media"][number], "id">[] }) =>
          post<{ request: MaintenanceRequest }>("/v1/tenant/maintenance", input),
        rate: (id: string, rating: number, comment?: string) => post<{ request: MaintenanceRequest }>(`/v1/tenant/maintenance/${id}/rating`, { rating, comment }),
      },
    },

    landlord: {
      properties: {
        list: () => get<Items<Property>>("/v1/landlord/properties"),
        create: (input: NewListing) => post<{ property: Property }>("/v1/landlord/properties", input),
        update: (id: string, input: Partial<Omit<NewListing, "documents">>) => patch<{ property: Property }>(`/v1/landlord/properties/${id}`, input),
        submit: (id: string) => post<{ property: Property }>(`/v1/landlord/properties/${id}/submit`),
        setOccupancy: (id: string, occupancy: Property["occupancy"], availableFrom?: string) =>
          patch<{ property: Property }>(`/v1/landlord/properties/${id}/occupancy`, { occupancy, availableFrom }),
        verification: (id: string) => get<{ verification: VerificationRequest | null }>(`/v1/landlord/properties/${id}/verification`),
        addDocument: (id: string, doc: NonNullable<NewListing["documents"]>[number]) => post<{ verification: VerificationRequest }>(`/v1/landlord/properties/${id}/documents`, doc),
        /** New rent; re-prices approved tenants' unpaid move-in invoices. */
        setRent: (id: string, rent: number) => post<{ updatedInvoices: number }>(`/v1/landlord/properties/${id}/rent`, { rent }),
      },
      applications: {
        list: () => get<Items<Application> & { properties: Property[]; tenants: AnyUser[] }>("/v1/landlord/applications"),
        decide: (id: string, status: "approved" | "rejected", note?: string) => post<{ application: Application }>(`/v1/landlord/applications/${id}/decision`, { status, note }),
      },
      tenancy: () =>
        get<{ leases: Lease[]; tenants: AnyUser[]; invoices: PaymentInvoice[]; refunds: CautionRefund[]; rentPlans: RentPlan[]; properties: Property[] }>("/v1/landlord/tenancy"),
      serveRentIncrease: (targets: { leaseId: string; newRent: number }[], note?: string) =>
        post<{ served: string[]; skipped: { leaseId: string; reason: string }[] }>("/v1/landlord/rent-increases", { targets, note }),
      respondRent: (leaseId: string, response: { acceptCounter: true } | { counter: number; note?: string } | { withdraw: true }) =>
        post<{ lease: Lease }>(`/v1/landlord/leases/${leaseId}/rent-review/respond`, response),
      respondToLeaseIntent: (leaseId: string) => post<{ lease: Lease }>(`/v1/landlord/leases/${leaseId}/intent/respond`),
      maintenance: {
        list: () => get<Items<MaintenanceRequest> & { properties: Property[]; tenants: AnyUser[]; leases: Lease[] }>("/v1/landlord/maintenance"),
        decide: (id: string, approved: boolean, note?: string) => post<{ request: MaintenanceRequest }>(`/v1/landlord/maintenance/${id}/decision`, { approved, note }),
      },
    },

    admin: {
      overview: () => get<Record<string, unknown>>("/v1/admin/overview"),
      users: {
        list: (f: { role?: UserRole; status?: User["status"]; identity?: IdentityVerification["status"]; q?: string; page?: number; pageSize?: number } = {}) =>
          get<Page<AnyUser>>(`/v1/admin/users${qs(f)}`),
        get: (id: string) => get<{ user: AnyUser }>(`/v1/admin/users/${id}`),
        reviewIdentity: (id: string, approved: boolean, reason?: string) => post<{ user: AnyUser }>(`/v1/admin/users/${id}/identity-review`, { approved, reason }),
        setStatus: (id: string, status: User["status"]) => patch<{ user: AnyUser }>(`/v1/admin/users/${id}`, { status }),
      },
      verifications: {
        list: (stage?: VerificationStage) => get<Items<{ verification: VerificationRequest; property: Property; landlord: AnyUser }>>(`/v1/admin/verifications${qs({ stage })}`),
        get: (id: string) => get<{ verification: VerificationRequest; property: Property; landlord: AnyUser }>(`/v1/admin/verifications/${id}`),
        update: (id: string, input: { priority?: VerificationRequest["priority"]; inspector?: string | null; inspectionDate?: string | null; riskFlags?: string[] }) =>
          patch<{ verification: VerificationRequest }>(`/v1/admin/verifications/${id}`, input),
        setChecklistItem: (id: string, key: string, done: boolean) => patch<{ verification: VerificationRequest }>(`/v1/admin/verifications/${id}/checklist/${key}`, { done }),
        addNote: (id: string, body: string) => post<{ verification: VerificationRequest }>(`/v1/admin/verifications/${id}/notes`, { body }),
        setDocumentStatus: (id: string, docId: string, status: VerificationRequest["documents"][number]["status"]) =>
          patch<{ verification: VerificationRequest }>(`/v1/admin/verifications/${id}/documents/${docId}`, { status }),
      },
      properties: {
        /** Moves the verification pipeline (note required for changes_requested and rejected). */
        setStage: (propertyId: string, stage: VerificationStage, extra: { note?: string; inspector?: string; inspectionDate?: string } = {}) =>
          post<{ property: Property; verification: VerificationRequest; matched: number }>(`/v1/admin/properties/${propertyId}/stage`, { stage, ...extra }),
        setFeatured: (propertyId: string, featured: boolean) => patch<{ property: Property }>(`/v1/admin/properties/${propertyId}`, { featured }),
      },
      invoices: {
        list: (status?: PaymentInvoice["status"]) => get<Items<PaymentInvoice> & { properties: Property[]; tenants: AnyUser[] }>(`/v1/admin/invoices${qs({ status })}`),
        verify: (id: string) => post<{ invoice: PaymentInvoice; lease: Lease }>(`/v1/admin/invoices/${id}/verify`),
        reject: (id: string, reason: string) => post<{ invoice: PaymentInvoice }>(`/v1/admin/invoices/${id}/reject`, { reason }),
      },
      refunds: {
        list: (status?: CautionRefund["status"]) => get<Items<CautionRefund> & { properties: Property[]; tenants: AnyUser[]; leases: Lease[] }>(`/v1/admin/refunds${qs({ status })}`),
        approve: (id: string, deduction?: { amount: number; reason: string }) => post<{ refund: CautionRefund }>(`/v1/admin/refunds/${id}/approve`, { deduction }),
        markPaid: (id: string) => post<{ refund: CautionRefund }>(`/v1/admin/refunds/${id}/paid`),
      },
      rentPlans: {
        list: (status?: RentPlan["status"]) =>
          get<Items<RentPlan> & { leases: Lease[]; properties: Property[]; tenants: AnyUser[] }>(`/v1/admin/rent-plans${qs({ status })}`),
        verifyInstallment: (planId: string, contributionId: string) => post<{ rentPlan: RentPlan }>(`/v1/admin/rent-plans/${planId}/contributions/${contributionId}/verify`),
        rejectInstallment: (planId: string, contributionId: string, reason: string) =>
          post<{ rentPlan: RentPlan }>(`/v1/admin/rent-plans/${planId}/contributions/${contributionId}/reject`, { reason }),
        payOut: (planId: string) => post<{ rentPlan: RentPlan }>(`/v1/admin/rent-plans/${planId}/payout`),
      },
      maintenance: {
        list: (status?: MaintenanceRequest["status"]) =>
          get<Items<MaintenanceRequest> & { properties: Property[]; tenants: AnyUser[]; leases: Lease[] }>(`/v1/admin/maintenance${qs({ status })}`),
        investigate: (id: string) => post<{ request: MaintenanceRequest }>(`/v1/admin/maintenance/${id}/investigate`),
        report: (id: string, report: { findings: string; recommendedFix: string; estimatedCost: number }) => post<{ request: MaintenanceRequest }>(`/v1/admin/maintenance/${id}/report`, report),
        dispatch: (id: string, technicianId: string, scheduledFor: string) => post<{ request: MaintenanceRequest }>(`/v1/admin/maintenance/${id}/dispatch`, { technicianId, scheduledFor }),
        complete: (id: string, note: string) => post<{ request: MaintenanceRequest }>(`/v1/admin/maintenance/${id}/complete`, { note }),
      },
      technicians: {
        list: () => get<Items<Technician>>("/v1/admin/technicians"),
        create: (input: Pick<Technician, "name" | "trade" | "company" | "phone">) => post<{ technician: Technician }>("/v1/admin/technicians", input),
        setActive: (id: string, active: boolean) => patch<Ok>(`/v1/admin/technicians/${id}`, { active }),
      },
      reports: {
        list: (status?: Report["status"]) => get<Items<Report>>(`/v1/admin/reports${qs({ status })}`),
        update: (id: string, input: { status?: Report["status"]; severity?: Report["severity"] }) => patch<{ report: Report }>(`/v1/admin/reports/${id}`, input),
      },
    },

    /** Local development only (the server mounts these when DEV_AUTH=true). */
    dev: {
      session: (who: { role: UserRole } | { profileId: string } | { email: string }) => post<{ token: string; user: AnyUser }>("/v1/dev/session", who),
      signup: (input: { role: "tenant" | "landlord"; name: string; email: string; phone?: string; city: string }) => post<{ token: string; user: AnyUser }>("/v1/dev/signup", input),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
