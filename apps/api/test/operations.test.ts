import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seed } from "../prisma/seed.js";
import { ADMIN, client, DAY, inbox, LANDLORD, makeApp, prisma, TENANT, testNow } from "./helpers.js";

beforeAll(() => seed(prisma));
afterAll(() => prisma.$disconnect());

const api = client(makeApp());

describe("repairs: tenant → admin → landlord → technician → done", () => {
  let id: string;
  const report = { findings: "Faulty thermostat", recommendedFix: "Replace thermostat", estimatedCost: 60_000 };

  it("tenant reports a problem with media; admin and landlord notified", async () => {
    const res = await api.as(TENANT).post("/v1/tenant/maintenance", {
      leaseId: "ls-5",
      title: "Shower has no hot water",
      category: "Plumbing",
      location: "Bathroom",
      description: "Water heater trips the breaker every time it is switched on.",
      urgency: "high",
      media: [{ kind: "image", url: "data:image/jpeg;base64,AAA", name: "heater.jpg" }],
    });
    expect(res.status).toBe(201);
    id = res.body.request.id;
    expect(res.body.request).toMatchObject({ status: "submitted", landlordId: LANDLORD, propertyId: "p-wus-010" });
    expect(res.body.request.timeline[0]).toMatchObject({ label: "Request submitted", by: "Chiamaka Eze" });
    expect((await inbox(ADMIN))[0]?.title).toBe("New repair request");
    expect((await inbox(LANDLORD))[0]?.title).toBe("Tenant reported an issue");
    expect((await api.as("u-tenant-2").post("/v1/tenant/maintenance", { ...res.body.request, leaseId: "ls-5", media: [] })).status).toBe(404);
  });

  it("enforces the order of steps", async () => {
    expect((await api.as(ADMIN).post(`/v1/admin/maintenance/${id}/report`, report)).body.error.code).toBe("stale_state");
    expect((await api.as(LANDLORD).post(`/v1/landlord/maintenance/${id}/decision`, { approved: true })).status).toBe(409);
  });

  it("runs the full pipeline and records a 6-step timeline", async () => {
    await api.as(ADMIN).post(`/v1/admin/maintenance/${id}/investigate`);
    const reported = await api.as(ADMIN).post(`/v1/admin/maintenance/${id}/report`, report);
    expect(reported.body.request).toMatchObject({ status: "awaiting_approval", investigation: { estimatedCost: 60_000, investigator: "Ibrahim Lawal" } });
    expect((await inbox(LANDLORD))[0]?.title).toBe("Repair needs your approval");

    expect((await api.as("u-landlord-2").post(`/v1/landlord/maintenance/${id}/decision`, { approved: true })).status).toBe(404);
    const approved = await api.as(LANDLORD).post(`/v1/landlord/maintenance/${id}/decision`, { approved: true, note: "Go ahead" });
    expect(approved.body.request.landlordDecision).toMatchObject({ approved: true, note: "Go ahead" });

    const jobsBefore = (await prisma.technician.findUniqueOrThrow({ where: { id: "tech-1" } })).jobsCompleted;
    await api.as(ADMIN).post(`/v1/admin/maintenance/${id}/dispatch`, { technicianId: "tech-1", scheduledFor: new Date(testNow().getTime() + DAY).toISOString() });
    expect((await inbox(TENANT))[0]?.title).toBe("Technician scheduled");

    const done = await api.as(ADMIN).post(`/v1/admin/maintenance/${id}/complete`, { note: "Replaced thermostat" });
    expect(done.body.request.status).toBe("completed");
    expect(done.body.request.timeline).toHaveLength(6);
    expect(done.body.request.timeline.at(-1).by).toBe("Musa Abdullahi");
    expect((await prisma.technician.findUniqueOrThrow({ where: { id: "tech-1" } })).jobsCompleted).toBe(jobsBefore + 1);

    const rated = await api.as(TENANT).post(`/v1/tenant/maintenance/${id}/rating`, { rating: 5, comment: "Great" });
    expect(rated.body.request.tenantFeedback).toMatchObject({ rating: 5, comment: "Great" });
    expect((await api.as(TENANT).post(`/v1/tenant/maintenance/${id}/rating`, { rating: 1 })).body.error.code).toBe("cannot_rate");
  });

  it("decline path", async () => {
    const r2 = (
      await api.as(TENANT).post("/v1/tenant/maintenance", {
        leaseId: "ls-5",
        title: "Repaint bedroom",
        category: "Other",
        location: "Bedroom",
        description: "Walls are scuffed and need repainting.",
        urgency: "low",
      })
    ).body.request.id;
    await api.as(ADMIN).post(`/v1/admin/maintenance/${r2}/investigate`);
    await api.as(ADMIN).post(`/v1/admin/maintenance/${r2}/report`, { findings: "Cosmetic", recommendedFix: "Repaint", estimatedCost: 150_000 });
    const declined = await api.as(LANDLORD).post(`/v1/landlord/maintenance/${r2}/decision`, { approved: false, note: "Tenant responsibility" });
    expect(declined.body.request.status).toBe("declined");
    expect((await inbox(TENANT))[0]?.body).toMatch(/declined\. Tenant responsibility/);
  });

  it("scopes lists by role", async () => {
    const mine = await api.as(TENANT).get("/v1/tenant/maintenance");
    expect(mine.body.items.every((m: any) => m.tenantId === TENANT)).toBe(true);
    const landlord = await api.as(LANDLORD).get("/v1/landlord/maintenance");
    expect(landlord.body.items.every((m: any) => m.landlordId === LANDLORD)).toBe(true);
    const queue = await api.as(ADMIN).get("/v1/admin/maintenance?status=completed");
    expect(queue.body.items.every((m: any) => m.status === "completed")).toBe(true);
    expect((await api.as(ADMIN).get("/v1/admin/technicians")).body.items.length).toBe(6);
  });
});

describe("messages", () => {
  it("shows the tenant's seeded threads with unread counts and marks them read", async () => {
    const list = await api.as(TENANT).get("/v1/threads");
    const t1 = list.body.items.find((t: any) => t.id === "t1");
    expect(t1).toMatchObject({ withName: "Ngozi Adeyemi", withRole: "landlord", unread: 1, propertyId: "p-lek-001" });
    expect(list.body.items.find((t: any) => t.id === "t3").withName).toBe("renton Support");
    await api.as(TENANT).post("/v1/threads/t1/read");
    expect((await api.as(TENANT).get("/v1/threads/t1")).body.thread.unread).toBe(0);
    // The landlord sees the same conversation from their side.
    expect((await api.as(LANDLORD).get("/v1/threads/t1")).body.thread).toMatchObject({ withName: "Chiamaka Eze", withRole: "tenant" });
    expect((await api.as("u-tenant-2").get("/v1/threads/t1")).status).toBe(404);
  });

  it("continues an existing conversation about the same home and notifies the other side", async () => {
    const res = await api.as(TENANT).post("/v1/threads", { propertyId: "p-lek-001", body: "Saturday at 11 works for me." });
    expect(res.body.thread.id).toBe("t1");
    expect(res.body.thread.lastMessage).toBe("Saturday at 11 works for me.");
    expect((await inbox(LANDLORD))[0]).toMatchObject({ kind: "message", title: "New message from Chiamaka Eze", href: "/landlord/messages" });
    const reply = await api.as(LANDLORD).post("/v1/threads/t1/messages", { body: "See you then!" });
    expect(reply.body.thread.messages.at(-1)).toMatchObject({ fromMe: true, body: "See you then!" });
    expect((await api.as(TENANT).get("/v1/threads/t1")).body.thread.unread).toBe(1);
  });

  it("reaches support without naming anyone, and limits who can be messaged", async () => {
    const support = await api.as("u-tenant-2").post("/v1/threads", { body: "How do I change my bank details?" });
    expect(support.body.thread).toMatchObject({ withRole: "admin", withName: "renton Support" });
    expect((await inbox(ADMIN))[0]?.title).toBe("New message from Babatunde Afolabi");

    // A tenant with no application or lease with this landlord, and no listing named.
    expect((await api.as("u-tenant-2").post("/v1/threads", { recipientId: "u-landlord-6", body: "Hi" })).status).toBe(403);
    // A landlord can message their own tenants…
    expect((await api.as(LANDLORD).post("/v1/threads", { recipientId: "u-tenant-2", body: "Inspection next week?" })).status).toBe(201);
    // …but not tenants with no tie to their homes.
    expect((await api.as("u-landlord-6").post("/v1/threads", { recipientId: TENANT, body: "Hello" })).status).toBe(403);
  });
});

describe("reports and the admin overview", () => {
  it("files a report, notifies admins, and lets admins triage it", async () => {
    const res = await api.as(TENANT).post("/v1/reports", {
      category: "fraud",
      subject: "Caller asking for inspection fee",
      subjectId: "ext-9999",
      reason: "Off-platform payment request",
      details: "Someone called claiming to be from renton and asked for ₦15,000.",
    });
    expect(res.body.report).toMatchObject({ severity: "high", status: "open", reportedBy: "Chiamaka Eze" });
    expect((await inbox(ADMIN))[0]?.title).toBe("New fraud report");
    const triaged = await api.as(ADMIN).patch(`/v1/admin/reports/${res.body.report.id}`, { status: "investigating", severity: "critical" });
    expect(triaged.body.report).toMatchObject({ status: "investigating", severity: "critical" });
    expect((await api.as(TENANT).get("/v1/admin/reports")).status).toBe(403);
  });

  it("counts what's waiting on the team", async () => {
    const res = await api.as(ADMIN).get("/v1/admin/overview");
    expect(res.body.usersByRole.tenant).toBeGreaterThan(0);
    expect(res.body.propertiesByStage.published).toBeGreaterThan(0);
    expect(res.body.invoicesByStatus.submitted).toBe(1);
    expect(res.body.waiting.installmentsToVerify).toBe(1);
  });
});
