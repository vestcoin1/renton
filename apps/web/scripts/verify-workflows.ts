/**
 * Smoke test for the simulated backend workflows (run: npx tsx scripts/verify-workflows.ts).
 * Exercises the store actions end to end without a browser.
 */
import assert from "node:assert/strict";

// In-memory localStorage so the persisted store can run under Node.
const mem = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) },
});

async function main() {
const { useStore } = await import("renton-core/store");
const { DEMO_ACCOUNTS } = await import("renton-core/mock/users");
const { signIn, signUp, postAuthPath, DEMO_PASSWORD } = await import("renton-core/auth");
const { hasSubmittedIdentity, identityStatus } = await import("renton-core/identity");
const s = () => useStore.getState();
const step = (msg: string) => console.log("âœ“", msg);
/** A user's inbox; a role means that role's demo account. */
const inbox = (who: "tenant" | "landlord" | "admin" | (string & {})) =>
  s().notifications[who in DEMO_ACCOUNTS ? DEMO_ACCOUNTS[who as keyof typeof DEMO_ACCOUNTS].id : who] ?? [];
const me = () => s().users.find((u) => u.id === s().userId)!;
const doc = (kind: "government_id" | "selfie" | "proof_of_income" | "proof_of_address") => ({ kind, name: `${kind}.jpg`, fileKind: "image" as const, url: "data:image/jpeg;base64,AAA", uploadedAt: new Date().toISOString() });

// â”€â”€ Auth: sign-up, sign-in, sessions â”€â”€
assert.equal((await signIn(DEMO_ACCOUNTS.tenant.email, "wrong-password")).ok, false, "wrong password rejected");
assert.equal((await signIn("nobody@example.com", DEMO_PASSWORD)).ok, false, "unknown email rejected");
assert.deepEqual(await signIn(DEMO_ACCOUNTS.landlord.email.toUpperCase(), DEMO_PASSWORD), { ok: true, role: "landlord" });
assert.equal(s().userId, DEMO_ACCOUNTS.landlord.id);
step("demo accounts sign in with email + password; bad credentials rejected");

const signup = await signUp({ role: "tenant", name: "Amaka Obi", email: "Amaka@Example.com ", phone: "+234 801 000 0000", city: "Lagos", password: "s3cret-pass" });
assert.deepEqual(signup, { ok: true, role: "tenant" });
const amakaId = s().userId!;
assert.equal(me().email, "amaka@example.com", "email normalised");
assert.ok(!JSON.stringify(s().credentials).includes("s3cret-pass"), "password not stored in plain text");
assert.equal(identityStatus(me()), "unverified");
assert.equal(inbox(amakaId)[0].href, "/tenant/verify", "new user told to verify");
assert.equal((await signUp({ role: "landlord", name: "Dup", email: "amaka@example.com", phone: "", city: "Lagos", password: "another-pass" })).ok, false, "duplicate email rejected");
assert.equal((await signUp({ role: "landlord", name: "Short", email: "short@example.com", phone: "", city: "Lagos", password: "123" })).ok, false, "short password rejected");
s().logout();
assert.equal((await signIn("amaka@example.com", "s3cret-pass")).ok, true);
assert.equal(s().userId, amakaId);
step("tenant signs up (email normalised, password hashed), signs out and back in");

assert.equal(postAuthPath("tenant", "/properties/p-lek-001"), "/properties/p-lek-001");
assert.equal(postAuthPath("tenant", "/landlord"), "/tenant", "can't land in another role's portal");
assert.equal(postAuthPath("tenant", "//evil.example"), "/tenant", "no open redirect");
step("post-login redirect stays local and inside the user's portal");

// â”€â”€ Zones: admin is a separate app under /admin; links between apps need a full page load â”€â”€
const zones = await import("renton-core/zones");
assert.equal(zones.CURRENT_ZONE, "web");
assert.equal(zones.isLocalPath("/tenant/verify"), true);
assert.equal(zones.isLocalPath("/admin/users?review=u-1"), false, "admin paths leave the web app");
assert.equal(zones.isLocalPath("/administrator"), true, "only the /admin segment belongs to admin");
assert.equal(zones.LOGIN_PATH, "/login");
step("zone routing: /admin/** belongs to the admin app, everything else to web");

// â”€â”€ Identity verification: tenant documents differ from landlord documents â”€â”€
assert.equal(hasSubmittedIdentity(me()), false);
s().submitIdentity({ idType: "NIN", idNumber: "12345678901", documents: [doc("government_id"), doc("selfie"), doc("proof_of_income")] });
assert.equal(identityStatus(me()), "pending");
assert.ok(hasSubmittedIdentity(me()), "tenant can apply while under review");
assert.equal(inbox("admin")[0].href, `/admin/users?review=${amakaId}`);
s().reviewIdentity(amakaId, false, "The ID photo is blurry.");
assert.equal(identityStatus(me()), "rejected");
assert.match(inbox(amakaId)[0].body, /blurry/);
s().submitIdentity({ idType: "NIN", idNumber: "12345678901", documents: [doc("government_id"), doc("selfie"), doc("proof_of_income")] });
s().reviewIdentity(amakaId, true);
assert.equal(identityStatus(me()), "verified");
assert.equal(me().identityVerified, true);
step("tenant submits ID, selfie and income proof â†’ admin rejects â†’ re-submits â†’ verified");

const newApp = s().applyToProperty({ propertyId: "p-lek-001", moveInDate: new Date().toISOString(), leaseYears: 1, message: "Hello, I'd love to rent this home.", documents: [] });
assert.equal(newApp.tenantId, amakaId, "application belongs to the signed-in tenant");
const lekLandlord = s().properties.find((p) => p.id === "p-lek-001")!.landlordId;
assert.match(inbox(lekLandlord)[0].body, /Amaka Obi applied/, "the property's own landlord is notified");
s().setApplicationStatus(newApp.id, "approved");
assert.equal(inbox(amakaId)[0].kind, "payment", "new tenant gets their approval");
step("new tenant's application reaches the right landlord and the approval reaches them");

await signUp({ role: "landlord", name: "Tunde Bello", email: "tunde@example.com", phone: "", city: "Abuja", password: "landlord-pass" });
const tundeId = s().userId!;
assert.equal(s().role, "landlord");
s().submitIdentity({ idType: "International Passport", idNumber: "A12345678", documents: [doc("government_id"), doc("proof_of_address")] });
assert.deepEqual(me().identity!.documents.map((d) => d.kind), ["government_id", "proof_of_address"]);
s().reviewIdentity(tundeId, true);
assert.equal(identityStatus(me()), "verified");
step("landlord signs up and verifies with ID + proof of address");

s().resetDemo();
assert.equal(s().userId, null, "reset signs out accounts it wipes");
s().loginDemo("tenant");

// â”€â”€ Maintenance: tenant â†’ admin â†’ landlord â†’ technician â†’ done â”€â”€
const lease = s().leases.find((l) => l.tenantId === "u-tenant-1" && l.status !== "ended");
assert.ok(lease, "demo tenant should have an active lease");

const req = s().createMaintenanceRequest({
  leaseId: lease.id,
  title: "Shower has no hot water",
  category: "Plumbing",
  location: "Bathroom",
  description: "Water heater trips the breaker every time it is switched on.",
  urgency: "high",
  media: [{ id: "x", kind: "image", url: "data:image/jpeg;base64,AAA", name: "heater.jpg" }],
});
const get = () => s().maintenance.find((m) => m.id === req.id)!;
assert.equal(get().status, "submitted");
assert.equal(get().landlordId, "u-landlord-1");
assert.ok(inbox("admin")[0].title.includes("repair"), "admin notified");
step("tenant submits request with media; admin notified");

s().startInvestigation(req.id);
assert.equal(get().status, "investigating");
step("admin starts investigation");

s().sendInvestigationReport(req.id, { findings: "Faulty thermostat", recommendedFix: "Replace thermostat", estimatedCost: 60_000 });
assert.equal(get().status, "awaiting_approval");
assert.equal(get().investigation?.estimatedCost, 60_000);
assert.equal(inbox("landlord")[0].title, "Repair needs your approval");
step("admin sends report â†’ landlord asked to approve");

s().decideMaintenance(req.id, true, "Go ahead");
assert.equal(get().status, "approved");
assert.equal(get().landlordDecision?.approved, true);
step("landlord approves");

s().dispatchTechnician(req.id, "tech-1", new Date(Date.now() + 86400000).toISOString());
assert.equal(get().status, "in_progress");
assert.equal(inbox("tenant")[0].title, "Technician scheduled");
step("admin dispatches technician; tenant notified");

s().completeMaintenance(req.id, "Replaced thermostat");
s().rateMaintenance(req.id, 5, "Great");
assert.equal(get().status, "completed");
assert.equal(get().tenantFeedback?.rating, 5);
assert.equal(get().timeline.length, 6);
step("completed and rated; timeline has 6 entries");

// Decline path
const r2 = s().createMaintenanceRequest({ ...req, leaseId: lease.id, title: "Repaint bedroom" });
s().startInvestigation(r2.id);
s().sendInvestigationReport(r2.id, { findings: "Cosmetic", recommendedFix: "Repaint", estimatedCost: 150_000 });
s().decideMaintenance(r2.id, false, "Tenant responsibility");
assert.equal(s().maintenance.find((m) => m.id === r2.id)!.status, "declined");
step("decline path works");

// â”€â”€ Lease intent: renew â”€â”€
const before = new Date(lease.leaseEnd).getFullYear();
s().setLeaseIntent(lease.id, { decision: "renew", renewYears: 2 });
assert.equal(inbox("landlord")[0].title, "Tenant wants to renew");
s().respondToLeaseIntent(lease.id);
const renewed = s().leases.find((l) => l.id === lease.id)!;
assert.equal(new Date(renewed.leaseEnd).getFullYear(), before + 2);
assert.equal(renewed.status, "active");
assert.equal(renewed.intent?.landlordResponse?.status, "accepted");
step("renewal accepted extends lease by 2 years");

// â”€â”€ Lease intent: move out â”€â”€
const other = s().leases.find((l) => l.id === "ls-4")!;
const moveOut = new Date(Date.now() + 20 * 86400000).toISOString();
s().setLeaseIntent(other.id, { decision: "move_out", moveOutDate: moveOut, reason: "Relocating" });
s().respondToLeaseIntent(other.id);
const prop = s().properties.find((p) => p.id === other.propertyId)!;
assert.equal(prop.occupancy, "available_soon");
assert.equal(prop.availableFrom, moveOut);
step("move-out acknowledged â†’ property listed as available soon");

// â”€â”€ Move-in payment: approve â†’ invoice â†’ receipt â†’ verify â†’ lease + documents â”€â”€
const app = s().applications.find((a) => a.id === "app-1001")!; // Chiamaka â†’ Lekki, pending
const rival = s().applications.find((a) => a.id === "app-1006")!; // another tenant, same home
assert.equal(app.status, "pending");
assert.equal(rival.status, "pending");
const lekki = s().properties.find((p) => p.id === app.propertyId)!;
assert.equal(lekki.occupancy, "vacant");

s().setApplicationStatus(app.id, "approved", "Welcome!");
const approved = s().applications.find((a) => a.id === app.id)!;
assert.ok(approved.invoiceId, "approval raises an invoice");
const inv = () => s().invoices.find((i) => i.id === approved.invoiceId)!;
const rent = lekki.rent * approved.leaseYears;
assert.equal(inv().status, "awaiting_payment");
assert.deepEqual(
  inv().items.map((i) => [i.key, i.amount]),
  [
    ["rent", rent],
    ["caution", lekki.cautionDeposit],
    ["agency", rent * 0.1],
  ]
);
assert.equal(inv().total, rent + lekki.cautionDeposit + rent * 0.1);
assert.equal(inbox("tenant")[0].kind, "payment");
assert.match(inbox("tenant")[0].body, /10% agency fee/);
step(`approval â†’ invoice â‚¦${inv().total.toLocaleString()} (rent + caution + 10% agency) and tenant asked to pay`);

const receipt = { name: "slip.png", kind: "image" as const, url: "data:image/png;base64,AAA", amountPaid: inv().total, paidOn: new Date().toISOString(), payerBank: "GTBank" };
s().submitPaymentReceipt(inv().id, { ...receipt, amountPaid: 1000 });
assert.equal(inv().status, "submitted");
assert.equal(inbox("admin")[0].title, "Payment receipt to verify");
s().rejectPayment(inv().id, "The amount paid is less than the total due.");
assert.equal(inv().status, "rejected");
step("receipt uploaded â†’ admin notified â†’ rejected with reason");

s().submitPaymentReceipt(inv().id, receipt);
assert.equal(inv().status, "submitted");
assert.equal(inv().rejectionReason, undefined);
const leasesBefore = s().leases.length;
s().verifyPayment(inv().id);
assert.equal(inv().status, "verified");
assert.ok(inv().receiptNumber && inv().agreementNumber && inv().leaseId);
assert.equal(s().leases.length, leasesBefore + 1);
const newLease = s().leases.find((l) => l.id === inv().leaseId)!;
assert.equal(newLease.tenantId, "u-tenant-1");
assert.equal(new Date(newLease.leaseStart).toISOString(), new Date(approved.moveInDate).toISOString());
assert.equal(s().properties.find((p) => p.id === lekki.id)!.occupancy, "occupied");
assert.equal(s().applications.find((a) => a.id === rival.id)!.status, "rejected");
assert.equal(inbox("tenant")[0].href, "/tenant/profile#documents");
step("re-upload â†’ verified â†’ lease created, home occupied, other applicants closed, documents ready");

// Documents render as real PDFs
const { buildTenancyAgreement, buildPaymentReceipt } = await import("../src/lib/documents");
const ctx = {
  invoice: inv(),
  lease: newLease,
  property: s().properties.find((p) => p.id === lekki.id)!,
  tenant: s().users.find((u) => u.id === "u-tenant-1")!,
  landlord: s().users.find((u) => u.id === lekki.landlordId)!,
};
const fsMod = await import("node:fs");
const outDir = process.env.PDF_OUT;
for (const [name, build] of [
  ["agreement", buildTenancyAgreement],
  ["receipt", buildPaymentReceipt],
] as const) {
  const buf = Buffer.from((await build(ctx)).output("arraybuffer"));
  assert.equal(buf.subarray(0, 5).toString(), "%PDF-");
  if (outDir) fsMod.writeFileSync(`${outDir}/${name}.pdf`, buf);
}
step("tenancy agreement and payment receipt generate valid PDFs");

// â”€â”€ Caution refunds: only after move-out notice, payable 30 days after notice â”€â”€
assert.equal(s().requestCautionRefund("ls-1", { bankName: "X", accountNumber: "0123456789", accountName: "Y" }), null, "no notice â†’ no refund");
s().setLeaseIntent("ls-1", { decision: "move_out", moveOutDate: new Date(Date.now() + 60 * 86400000).toISOString() });
const fresh = s().requestCautionRefund("ls-1", { bankName: "GTBank", accountNumber: "0123456789", accountName: "Babatunde Afolabi" })!;
assert.ok(fresh, "refund requested after notice");
const waitDays = Math.round((+new Date(fresh.eligibleFrom) - Date.now()) / 86400000);
assert.ok(waitDays >= 29 && waitDays <= 30, `eligible ~30 days after notice (got ${waitDays})`);
assert.equal(s().approveCautionRefund(fresh.id), false, "cannot approve inside 30-day wait");
assert.equal(s().refunds.find((r) => r.id === fresh.id)!.status, "requested");
step("refund requested after move-out notice; approval blocked for 30 days");

assert.equal(s().approveCautionRefund("rf-301", { amount: 100_000, reason: "Broken wardrobe door" }), true);
s().markRefundPaid("rf-301");
const paidRefund = s().refunds.find((r) => r.id === "rf-301")!;
assert.equal(paidRefund.status, "paid");
assert.ok(paidRefund.payoutReference);
step("eligible refund approved with deduction and paid");

// â”€â”€ Rent review: 3-month notice, negotiation, non-negotiable for not-moved-in â”€â”€
const r1 = s().serveRentIncrease(
  [
    { leaseId: "ls-2", newRent: 10_000_000 }, // 25 days left â†’ too late
    { leaseId: "ls-4", newRent: 4_600_000 }, // 275 days left â†’ OK, negotiable
    { leaseId: newLease.id, newRent: 10_500_000 }, // not moved in â†’ non-negotiable
  ],
  "Market review"
);
assert.deepEqual(r1.served.sort(), ["ls-4", newLease.id].sort());
assert.equal(r1.skipped[0].leaseId, "ls-2");
assert.match(r1.skipped[0].reason, /3 months/);
const notMovedIn = s().leases.find((l) => l.id === newLease.id)!.rentReview!;
assert.equal(notMovedIn.negotiable, false);
assert.equal(notMovedIn.status, "agreed");
assert.equal(s().leases.find((l) => l.id === "ls-4")!.rentReview!.status, "proposed");
step("rent notice: <3 months skipped, current tenant negotiable, not-moved-in tenant fixed");

s().tenantRespondRent(newLease.id, { counter: 9_000_000 });
assert.equal(s().leases.find((l) => l.id === newLease.id)!.rentReview!.status, "agreed", "not-moved-in tenant cannot counter");

// Chiamaka's seeded review (ls-5): counter â†’ landlord counters â†’ tenant accepts
const rr = () => s().leases.find((l) => l.id === "ls-5")!.rentReview!;
s().tenantRespondRent("ls-5", { counter: 8_800_000, note: "Long-term tenant" });
assert.equal(rr().status, "countered");
assert.equal(inbox("landlord")[0].title, "Tenant made a counter-offer");
s().landlordRespondRent("ls-5", { counter: 9_000_000, note: "Meet in the middle?" });
assert.equal(rr().status, "proposed");
s().tenantRespondRent("ls-5", { accept: true });
assert.equal(rr().status, "agreed");
assert.equal(rr().agreedRent, 9_000_000);
assert.equal(rr().offers.length, 3); // landlord â†’ tenant â†’ landlord; acceptance adds no offer
s().setLeaseIntent("ls-5", { decision: "renew", renewYears: 1 });
s().respondToLeaseIntent("ls-5");
assert.equal(s().leases.find((l) => l.id === "ls-5")!.annualRent, 9_000_000);
step("negotiation: counter â†’ revised offer â†’ accepted; renewal uses agreed â‚¦9,000,000");

// New tenant awaiting payment pays the full new rent
s().setApplicationStatus("app-1005", "approved");
const graInvoice = () => s().invoices.find((i) => i.applicationId === "app-1005")!;
assert.equal(graInvoice().status, "awaiting_payment");
const graCaution = s().properties.find((p) => p.id === "p-gra-014")!.cautionDeposit;
assert.equal(s().applyRentToNewTenants("p-gra-014", 9_000_000), 1);
const graYears = s().applications.find((a) => a.id === "app-1005")!.leaseYears;
assert.equal(graInvoice().total, 9_000_000 * graYears + graCaution + 900_000 * graYears);
assert.equal(s().properties.find((p) => p.id === "p-gra-014")!.rent, 9_000_000);
step("approved-but-unpaid tenant's invoice re-priced at full new rent (no negotiation)");

// â”€â”€ Rent installments: any amount â†’ admin verifies â†’ funded â†’ renton pays landlord â”€â”€
{
  const { rentPlanProgress, currentRentPlan, nextTermRent } = await import("renton-core/tenancy-rules");
  const receipt = (amountPaid: number) => ({ name: "r.png", kind: "image" as const, url: "data:image/png;base64,AAA", amountPaid, paidOn: new Date().toISOString(), payerBank: "Demo Bank" });

  // Seeded funded plan (ls-1) pays out; an unfunded one can't.
  assert.equal(s().payOutRentPlan("rp-1"), false, "unfunded plan cannot be paid out");
  assert.equal(s().payOutRentPlan("rp-2"), true);
  const rp2 = s().rentPlans.find((p) => p.id === "rp-2")!;
  assert.equal(rp2.status, "paid_out");
  assert.equal(rp2.payout!.amount, 14_000_000);
  assert.equal(s().payOutRentPlan("rp-2"), false, "no double payout");
  step("funded plan paid out to landlord once; unfunded plan blocked");

  // A fresh plan on the lease created above (no seeded plan): flexible amounts, rejection, cap, minimum.
  const planLease = () => s().leases.find((l) => l.id === newLease.id)!;
  const plan = s().startRentPlan(newLease.id, "flexible")!;
  assert.ok(plan);
  assert.equal(s().startRentPlan(newLease.id, "monthly"), null, "one open plan per lease");
  const target = nextTermRent(planLease());
  const prog = () => rentPlanProgress(s().rentPlans.find((p) => p.id === plan.id)!, planLease());
  const lastC = () => s().rentPlans.find((p) => p.id === plan.id)!.contributions.at(-1)!;

  assert.equal(s().submitRentContribution(plan.id, receipt(1_000)).ok, false, "below minimum");
  assert.equal(s().submitRentContribution(plan.id, receipt(target + 1)).ok, false, "more than the rent");
  assert.ok(s().submitRentContribution(plan.id, receipt(700_000)).ok);
  assert.equal(inbox("admin")[0].title, "Rent installment to verify");
  s().rejectRentContribution(plan.id, lastC().id, "Not found");
  assert.equal(prog().saved, 0);
  assert.ok(s().submitRentContribution(plan.id, receipt(1_250_000)).ok);
  s().verifyRentContribution(plan.id, lastC().id);
  assert.equal(prog().saved, 1_250_000);
  // Pending money counts against what's left, so the tenant can't overpay while waiting.
  assert.ok(s().submitRentContribution(plan.id, receipt(target - 1_250_000 - 1_000)).ok);
  assert.equal(prog().maxNext, 1_000);
  assert.equal(s().submitRentContribution(plan.id, receipt(2_000)).ok, false);
  assert.ok(s().submitRentContribution(plan.id, receipt(1_000)).ok, "final installment may be below the minimum");
  for (const c of s().rentPlans.find((p) => p.id === plan.id)!.contributions.filter((c) => c.status === "submitted")) s().verifyRentContribution(plan.id, c.id);
  assert.ok(prog().funded);
  assert.equal(inbox("admin")[0].title, "Rent fully paid: pay the landlord");
  assert.ok(s().payOutRentPlan(plan.id));
  assert.equal(currentRentPlan(s().rentPlans, planLease())!.status, "paid_out", "paid term still shows until lease renews");
  assert.equal(s().startRentPlan(newLease.id, "monthly"), null, "can't reopen a paid term");
  step("installments: min/cap enforced, rejected receipts don't count, funded â†’ payout");

  // Moving-out tenants can't start or add to a plan.
  assert.equal(s().startRentPlan("ls-2", "monthly"), null);
  step("tenant who gave move-out notice can't start a rent plan");
}

console.log("\nAll workflow checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


