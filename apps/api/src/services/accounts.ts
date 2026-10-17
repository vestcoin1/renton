import { randomInt } from "node:crypto";
import type { Db } from "./notifications.js";
import { notify } from "./notifications.js";
import { profileInclude } from "../mappers.js";
import { ApiError } from "../lib/errors.js";

export interface NewProfileInput {
  role: "tenant" | "landlord";
  name: string;
  email: string;
  phone: string;
  city: string;
  authUserId: string | null;
}

/** Creates a tenant or landlord profile with role defaults, an unverified identity and a "verify" prompt (as registerAccount did). */
export async function createProfile(db: Db, now: Date, input: NewProfileInput) {
  const email = input.email.trim().toLowerCase();
  if (await db.profile.findUnique({ where: { email }, select: { id: true } })) {
    throw ApiError.conflict("An account with this email already exists. Sign in instead.", "email_in_use");
  }
  const profile = await db.profile.create({
    data: {
      role: input.role,
      name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      city: input.city.trim(),
      authUserId: input.authUserId,
      avatarHue: randomInt(360),
      joinedAt: now,
      identity: { create: { status: "unverified" } },
      ...(input.role === "tenant"
        ? { tenantProfile: { create: { occupation: "", employer: "", employmentType: "Full-time", monthlyIncome: 0, maritalStatus: "Single", householdSize: 1 } } }
        : { landlordProfile: { create: { isDiaspora: false, residence: `${input.city.trim()}, Nigeria`, responseRate: 100, responseTime: "within a day" } } }),
    },
    include: profileInclude,
  });
  await notify(db, now, [
    [
      profile.id,
      {
        title: "Verify your identity",
        body:
          input.role === "tenant"
            ? "Upload your ID, a selfie and proof of income so landlords can accept your applications."
            : "Upload your ID and proof of address before you list a property.",
        kind: "verification",
        href: `/${input.role}/verify`,
      },
    ],
  ]);
  return profile;
}
