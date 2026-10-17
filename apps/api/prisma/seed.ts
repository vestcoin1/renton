/**
 * Loads the frontend's mock data (renton-core/mock) into Postgres, keeping the same IDs
 * so the web, admin and mobile apps see identical records once they switch to the API.
 *
 * Destructive: every table is truncated first. Refuses to run with NODE_ENV=production.
 *
 * Child records (checklist items, notes, timeline entries, offers, messages) reuse short IDs
 * like "n1" across parents in the mock data, so they are prefixed with the parent ID here.
 */
import { pathToFileURL } from "node:url";
import { PrismaClient, type Prisma } from "@prisma/client";
import { PROPERTIES } from "renton-core/mock/properties";
import { ADMIN, DEMO_ACCOUNTS, LANDLORDS, TENANTS } from "renton-core/mock/users";
import { APPLICATIONS, LEASES, NOTIFICATIONS, REPORTS, THREADS, VERIFICATIONS, WAITING_LISTS } from "renton-core/mock/records";
import { MAINTENANCE, TECHNICIANS } from "renton-core/mock/maintenance";
import { INVOICES } from "renton-core/mock/payments";
import { REFUNDS } from "renton-core/mock/refunds";
import { RENT_PLANS } from "renton-core/mock/rent-plans";

/** Mirrors SAVED_SEED in renton-core/store.ts (not exported because the store is client-only). */
const DEMO_TENANT_SAVED = ["p-vi-006", "p-mai-009", "p-gra-014"];

const d = (iso: string) => new Date(iso);
const dOpt = (iso?: string) => (iso ? new Date(iso) : null);
const child = (parentId: string, id: string) => `${parentId}-${id}`;

type Tx = Prisma.TransactionClient;

async function truncateAll(tx: Tx) {
  const tables = await tx.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  await tx.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"public"."${t.tablename}"`).join(", ")} CASCADE`);
}

export async function seed(db: PrismaClient) {
  const users = [...TENANTS, ...LANDLORDS, ADMIN];
  const idByName = new Map(users.map((u) => [u.name, u.id]));

  await db.$transaction(
    async (tx) => {
      await truncateAll(tx);

      // ─── People ───
      await tx.profile.createMany({
        data: users.map((u) => ({
          id: u.id,
          role: u.role,
          name: u.name,
          email: u.email.trim().toLowerCase(),
          phone: u.phone,
          city: u.city,
          status: u.status,
          identityVerified: u.identityVerified,
          avatarHue: u.avatarHue ?? null,
          joinedAt: d(u.joinedAt),
        })),
      });
      await tx.tenantProfile.createMany({
        data: TENANTS.map((t) => ({
          profileId: t.id,
          occupation: t.occupation,
          employer: t.employer,
          employmentType: t.employmentType,
          monthlyIncome: t.monthlyIncome,
          maritalStatus: t.maritalStatus,
          householdSize: t.householdSize,
          guarantor: t.guarantor ?? null,
        })),
      });
      await tx.landlordProfile.createMany({
        data: LANDLORDS.map((l) => ({
          profileId: l.id,
          company: l.company ?? null,
          isDiaspora: l.isDiaspora,
          residence: l.residence,
          responseRate: l.responseRate,
          responseTime: l.responseTime,
          propertiesCount: l.propertiesCount,
          rating: l.rating,
        })),
      });

      // ─── Properties & verification ───
      await tx.property.createMany({
        data: PROPERTIES.map((p) => ({
          id: p.id,
          landlordId: p.landlordId,
          title: p.title,
          type: p.type,
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
          waterSupply: p.waterSupply,
          power: p.power,
          security: p.security,
          amenities: p.amenities,
          verification: p.verification,
          occupancy: p.occupancy,
          availableFrom: d(p.availableFrom),
          listedAt: d(p.listedAt),
          verifiedAt: dOpt(p.verifiedAt),
          views: p.views,
          featured: p.featured ?? false,
          nearby: p.nearby as unknown as Prisma.InputJsonValue,
        })),
      });
      await tx.propertyImage.createMany({
        data: PROPERTIES.flatMap((p) => p.images.map((url, position) => ({ propertyId: p.id, url, position }))),
      });

      for (const v of VERIFICATIONS) {
        await tx.verificationRequest.create({
          data: {
            id: v.id,
            propertyId: v.propertyId,
            stage: v.stage,
            priority: v.priority,
            inspector: v.inspector ?? null,
            inspectionDate: dOpt(v.inspectionDate),
            riskFlags: v.riskFlags,
            submittedAt: d(v.submittedAt),
            documents: {
              create: v.documents.map((doc) => ({
                id: child(v.id, doc.id),
                name: doc.name,
                kind: doc.kind,
                sizeKb: doc.sizeKb,
                status: doc.status,
                uploadedAt: d(doc.uploadedAt),
              })),
            },
            checklist: {
              create: v.checklist.map((item, position) => ({
                key: item.id,
                label: item.label,
                description: item.description,
                done: item.done,
                position,
              })),
            },
            notes: {
              create: v.notes.map((n) => ({ id: child(v.id, n.id), authorName: n.author, body: n.body, createdAt: d(n.createdAt) })),
            },
          },
        });
      }

      // ─── Search & applications ───
      await tx.savedProperty.createMany({
        // The mock has no saved-at times; date them before the mock's anchor day (6 Oct 2026), newest first.
        data: DEMO_TENANT_SAVED.map((propertyId, i) => ({ profileId: DEMO_ACCOUNTS.tenant.id, propertyId, createdAt: new Date(Date.UTC(2026, 9, 5) - i * 86_400_000) })),
      });
      await tx.application.createMany({
        data: APPLICATIONS.map((a) => ({
          id: a.id,
          propertyId: a.propertyId,
          tenantId: a.tenantId,
          status: a.status,
          moveInDate: d(a.moveInDate),
          leaseYears: a.leaseYears,
          message: a.message,
          documents: a.documents,
          landlordNote: a.landlordNote ?? null,
          submittedAt: d(a.submittedAt),
          updatedAt: d(a.updatedAt),
        })),
      });
      await tx.waitingList.createMany({
        data: WAITING_LISTS.map((w) => ({
          id: w.id,
          tenantId: w.tenantId,
          city: w.city,
          areas: w.areas,
          propertyType: w.propertyType,
          bedrooms: w.bedrooms,
          minBudget: w.minBudget,
          maxBudget: w.maxBudget,
          moveIn: w.moveIn,
          status: w.status,
          createdAt: d(w.createdAt),
        })),
      });

      // ─── Tenancy ───
      await tx.lease.createMany({
        data: LEASES.map((l) => ({
          id: l.id,
          propertyId: l.propertyId,
          tenantId: l.tenantId,
          unit: l.unit,
          leaseStart: d(l.leaseStart),
          leaseEnd: d(l.leaseEnd),
          annualRent: l.annualRent,
          status: l.status,
          lastPaymentAt: dOpt(l.lastPaymentAt),
        })),
      });
      await tx.leaseIntent.createMany({
        data: LEASES.filter((l) => l.intent).map((l) => {
          const i = l.intent!;
          return {
            leaseId: l.id,
            decision: i.decision,
            renewYears: i.renewYears ?? null,
            moveOutDate: dOpt(i.moveOutDate),
            reason: i.reason ?? null,
            note: i.note ?? null,
            submittedAt: d(i.submittedAt),
            landlordResponse: i.landlordResponse?.status ?? null,
            landlordRespondedAt: dOpt(i.landlordResponse?.at),
          };
        }),
      });
      for (const l of LEASES) {
        const r = l.rentReview;
        if (!r) continue;
        await tx.rentReview.create({
          data: {
            id: r.id,
            leaseId: l.id,
            currentRent: r.currentRent,
            proposedRent: r.proposedRent,
            effectiveFrom: d(r.effectiveFrom),
            noticeServedAt: d(r.noticeServedAt),
            negotiable: r.negotiable,
            status: r.status,
            agreedRent: r.agreedRent ?? null,
            agreedAt: dOpt(r.agreedAt),
            createdAt: d(r.noticeServedAt),
            offers: { create: r.offers.map((o) => ({ id: child(r.id, o.id), by: o.by, amount: o.amount, note: o.note ?? null, at: d(o.at) })) },
          },
        });
      }

      // ─── Money ───
      for (const inv of INVOICES) {
        const receiptId = inv.receipt ? child(inv.id, "receipt") : null;
        if (inv.receipt) {
          await tx.paymentReceipt.create({
            data: {
              id: receiptId!,
              name: inv.receipt.name,
              fileKind: inv.receipt.kind,
              url: inv.receipt.url,
              amountPaid: inv.receipt.amountPaid,
              paidOn: d(inv.receipt.paidOn),
              payerBank: inv.receipt.payerBank,
              uploadedAt: d(inv.receipt.uploadedAt),
            },
          });
        }
        await tx.paymentInvoice.create({
          data: {
            id: inv.id,
            applicationId: inv.applicationId,
            propertyId: inv.propertyId,
            tenantId: inv.tenantId,
            landlordId: inv.landlordId,
            reference: inv.reference,
            total: inv.total,
            status: inv.status,
            dueDate: d(inv.dueDate),
            receiptId,
            rejectionReason: inv.rejectionReason ?? null,
            verifiedAt: dOpt(inv.verifiedAt),
            verifiedById: inv.verifiedBy ? (idByName.get(inv.verifiedBy) ?? null) : null,
            receiptNumber: inv.receiptNumber ?? null,
            agreementNumber: inv.agreementNumber ?? null,
            leaseId: inv.leaseId ?? null,
            createdAt: d(inv.createdAt),
            items: { create: inv.items.map((it) => ({ key: it.key, label: it.label, amount: it.amount })) },
          },
        });
      }

      await tx.cautionRefund.createMany({
        data: REFUNDS.map((r) => ({
          id: r.id,
          leaseId: r.leaseId,
          tenantId: r.tenantId,
          propertyId: r.propertyId,
          landlordId: r.landlordId,
          amount: r.amount,
          eligibleFrom: d(r.eligibleFrom),
          bankName: r.bank.bankName,
          accountNumber: r.bank.accountNumber,
          accountName: r.bank.accountName,
          status: r.status,
          deductionAmount: r.deduction?.amount ?? null,
          deductionReason: r.deduction?.reason ?? null,
          approvedAt: dOpt(r.approvedAt),
          paidAt: dOpt(r.paidAt),
          payoutReference: r.payoutReference ?? null,
          requestedAt: d(r.requestedAt),
        })),
      });

      for (const plan of RENT_PLANS) {
        await tx.rentPlan.create({
          data: {
            id: plan.id,
            leaseId: plan.leaseId,
            tenantId: plan.tenantId,
            propertyId: plan.propertyId,
            landlordId: plan.landlordId,
            reference: plan.reference,
            dueDate: d(plan.dueDate),
            schedule: plan.schedule,
            status: plan.status,
            payoutAmount: plan.payout?.amount ?? null,
            payoutReference: plan.payout?.reference ?? null,
            payoutAt: dOpt(plan.payout?.at),
            payoutById: plan.payout ? (idByName.get(plan.payout.by) ?? null) : null,
            createdAt: d(plan.createdAt),
          },
        });
        for (const c of plan.contributions) {
          const receiptId = child(c.id, "receipt");
          await tx.paymentReceipt.create({
            data: {
              id: receiptId,
              name: c.receipt.name,
              fileKind: c.receipt.kind,
              url: c.receipt.url,
              amountPaid: c.receipt.amountPaid,
              paidOn: d(c.receipt.paidOn),
              payerBank: c.receipt.payerBank,
              uploadedAt: d(c.receipt.uploadedAt),
            },
          });
          await tx.rentContribution.create({
            data: {
              id: c.id,
              planId: plan.id,
              amount: c.amount,
              receiptId,
              status: c.status,
              rejectionReason: c.rejectionReason ?? null,
              verifiedAt: dOpt(c.verifiedAt),
              receiptNumber: c.receiptNumber ?? null,
              createdAt: d(c.receipt.uploadedAt),
            },
          });
        }
      }

      // ─── Maintenance ───
      await tx.technician.createMany({ data: TECHNICIANS.map((t) => ({ ...t })) });
      for (const m of MAINTENANCE) {
        await tx.maintenanceRequest.create({
          data: {
            id: m.id,
            leaseId: m.leaseId,
            propertyId: m.propertyId,
            tenantId: m.tenantId,
            landlordId: m.landlordId,
            title: m.title,
            category: m.category,
            location: m.location,
            description: m.description,
            urgency: m.urgency,
            status: m.status,
            investigatorName: m.investigation?.investigator ?? null,
            findings: m.investigation?.findings ?? null,
            recommendedFix: m.investigation?.recommendedFix ?? null,
            estimatedCost: m.investigation?.estimatedCost ?? null,
            investigatedAt: dOpt(m.investigation?.at),
            landlordApproved: m.landlordDecision?.approved ?? null,
            landlordNote: m.landlordDecision?.note ?? null,
            decidedAt: dOpt(m.landlordDecision?.at),
            technicianId: m.technician?.technicianId ?? null,
            scheduledFor: dOpt(m.technician?.scheduledFor),
            completedAt: dOpt(m.completion?.at),
            completionNote: m.completion?.note ?? null,
            rating: m.tenantFeedback?.rating ?? null,
            feedbackComment: m.tenantFeedback?.comment ?? null,
            ratedAt: dOpt(m.tenantFeedback?.at),
            createdAt: d(m.createdAt),
            updatedAt: d(m.updatedAt),
            media: { create: m.media.map((x) => ({ id: child(m.id, x.id), kind: x.kind, url: x.url, name: x.name })) },
            events: {
              create: m.timeline.map((e) => ({ id: child(m.id, e.id), status: e.status, label: e.label, note: e.note ?? null, byName: e.by, at: d(e.at) })),
            },
          },
        });
      }

      // ─── Trust & safety, notifications, messages ───
      await tx.report.createMany({
        data: REPORTS.map((r) => ({
          id: r.id,
          category: r.category,
          subject: r.subject,
          subjectId: r.subjectId,
          reason: r.reason,
          details: r.details,
          reporterName: r.reportedBy,
          severity: r.severity,
          status: r.status,
          createdAt: d(r.createdAt),
        })),
      });

      await tx.notification.createMany({
        data: (Object.keys(NOTIFICATIONS) as (keyof typeof NOTIFICATIONS)[]).flatMap((role) =>
          NOTIFICATIONS[role].map((n) => ({
            id: n.id,
            profileId: DEMO_ACCOUNTS[role].id,
            title: n.title,
            body: n.body,
            kind: n.kind,
            href: n.href ?? null,
            read: n.read,
            createdAt: d(n.createdAt),
          })),
        ),
      });

      // Mock threads are written from the demo tenant's point of view.
      const me = DEMO_ACCOUNTS.tenant.id;
      for (const t of THREADS) {
        const other = t.withRole === "admin" ? ADMIN.id : idByName.get(t.withName);
        if (!other) throw new Error(`Seed: no profile named "${t.withName}" for thread ${t.id}`);
        const msgs = [...t.messages].sort((a, b) => a.at.localeCompare(b.at));
        const lastAt = d(msgs[msgs.length - 1]!.at);
        // Everything before the last `unread` messages counts as read by the tenant.
        const readUpTo = t.unread > 0 ? msgs[msgs.length - t.unread - 1] : msgs[msgs.length - 1];
        await tx.messageThread.create({
          data: {
            id: t.id,
            propertyId: t.propertyId ?? null,
            createdAt: d(msgs[0]!.at),
            updatedAt: d(t.updatedAt),
            participants: {
              create: [
                { profileId: me, lastReadAt: readUpTo ? d(readUpTo.at) : null },
                { profileId: other, lastReadAt: lastAt },
              ],
            },
            messages: {
              create: msgs.map((m) => ({ id: child(t.id, m.id), senderId: m.fromMe ? me : other, body: m.body, createdAt: d(m.at) })),
            },
          },
        });
      }
    },
    { timeout: 60_000 },
  );

  return {
    profiles: users.length,
    properties: PROPERTIES.length,
    verifications: VERIFICATIONS.length,
    applications: APPLICATIONS.length,
    leases: LEASES.length,
    invoices: INVOICES.length,
    rentPlans: RENT_PLANS.length,
    maintenance: MAINTENANCE.length,
    threads: THREADS.length,
  };
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed with NODE_ENV=production: the seed truncates every table.");
  }
  const db = new PrismaClient();
  try {
    const counts = await seed(db);
    console.log("Seeded:", counts);
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
