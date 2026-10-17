import type { Context } from "hono";
import { z } from "zod";
import { ApiError } from "./errors.js";

/** Parses the JSON body with a zod schema; a ZodError becomes a 400 `validation_failed`. */
export async function body<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    throw ApiError.badRequest("Request body must be valid JSON.");
  }
  return schema.parse(json);
}

export function query<T extends z.ZodType>(c: Context, schema: T): z.infer<T> {
  return schema.parse(c.req.query());
}

// Shared field schemas
export const isoDate = z.iso.datetime({ offset: true }).or(z.iso.date());
export const naira = z.number().int().nonnegative().max(10_000_000_000);
export const text = (max = 2000) => z.string().trim().min(1).max(max);
export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));
