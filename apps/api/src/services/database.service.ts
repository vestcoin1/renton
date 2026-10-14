import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export class RentonDatabaseService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async healthCheck() {
    return this.db.$queryRaw`SELECT 1 AS ok`;
  }

  get user() {
    return this.db.user;
  }

  get property() {
    return this.db.property;
  }

  get application() {
    return this.db.application;
  }

  get waitingList() {
    return this.db.waitingList;
  }

  get lease() {
    return this.db.lease;
  }

  get verificationRequest() {
    return this.db.verificationRequest;
  }

  get report() {
    return this.db.report;
  }

  get notification() {
    return this.db.notification;
  }

  get maintenanceRequest() {
    return this.db.maintenanceRequest;
  }

  get paymentInvoice() {
    return this.db.paymentInvoice;
  }

  get cautionRefund() {
    return this.db.cautionRefund;
  }

  get rentPlan() {
    return this.db.rentPlan;
  }

  get rentContribution() {
    return this.db.rentContribution;
  }

  async listUsers() {
    return this.db.user.findMany({
      orderBy: { joinedAt: "desc" },
    });
  }

  async listProperties() {
    return this.db.property.findMany({
      orderBy: { listedAt: "desc" },
    });
  }

  async getPropertyById(id: string) {
    return this.db.property.findUnique({
      where: { id },
    });
  }

  async createUser(input: Prisma.UserCreateInput) {
    return this.db.user.create({ data: input });
  }

  async upsertProperty(id: string, input: Prisma.PropertyCreateInput | Prisma.PropertyUpdateInput) {
    return this.db.property.upsert({
      where: { id },
      create: input as Prisma.PropertyCreateInput,
      update: input as Prisma.PropertyUpdateInput,
    });
  }
}

export const databaseService = new RentonDatabaseService();
export type { Prisma } from "@prisma/client";
