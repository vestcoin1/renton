import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../auth/middleware.js";
import type { AppEnv } from "../context.js";
import { ApiError } from "../lib/errors.js";
import { BUCKETS, toStorageRef, type UploadPurpose } from "../lib/storage.js";
import { body } from "../lib/validate.js";

const PURPOSE_ROLES: Record<UploadPurpose, ("tenant" | "landlord" | "admin")[]> = {
  identity: ["tenant", "landlord"],
  receipt: ["tenant"],
  maintenance: ["tenant"],
  property_image: ["landlord"],
  verification_document: ["landlord", "admin"],
};

const schema = z.object({
  purpose: z.enum(Object.keys(BUCKETS) as [UploadPurpose, ...UploadPurpose[]]),
  fileName: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().positive(),
});

/**
 * Step 1 of an upload: returns a signed URL the client PUTs the file to (valid ~2 hours),
 * and the `ref` to send back when attaching the file to a record.
 */
export const uploads = new Hono<AppEnv>().post("/", requireUser(), async (c) => {
  const { storage } = c.get("deps");
  const user = c.get("user");
  if (!storage) throw new ApiError(501, "storage_not_configured", "File storage isn't configured on this server. Attach files inline instead.");
  const input = await body(c, schema);
  if (!PURPOSE_ROLES[input.purpose].includes(user.role)) throw ApiError.forbidden();
  const bucket = BUCKETS[input.purpose];
  if (!(bucket.types as readonly string[]).includes(input.contentType)) {
    throw ApiError.badRequest(`Unsupported file type ${input.contentType}.`, { allowed: bucket.types });
  }
  if (input.sizeBytes > bucket.maxMb * 1024 * 1024) throw ApiError.badRequest(`Files must be ${bucket.maxMb} MB or smaller.`);

  const safeName = input.fileName.replace(/[^\w.-]+/g, "_").slice(-80);
  const path = `${user.id}/${randomUUID()}-${safeName}`;
  const { uploadUrl } = await storage.createUploadUrl(bucket.name, path);
  return c.json({ ref: toStorageRef(bucket.name, path), uploadUrl, method: "PUT", headers: { "Content-Type": input.contentType } }, 201);
});
