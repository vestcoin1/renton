import { Prisma } from "@prisma/client";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";

/**
 * Every error response has the same shape:
 *   { error: { code, message, details?, requestId } }
 * `code` is stable and machine-readable; `message` is safe to show users.
 */
export interface ErrorBody {
  error: { code: string; message: string; details?: unknown; requestId?: string };
}

export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "bad_request", message, details);
  }
  static unauthorized(message = "Sign in to continue.") {
    return new ApiError(401, "unauthorized", message);
  }
  static forbidden(message = "You don't have access to this.") {
    return new ApiError(403, "forbidden", message);
  }
  static notFound(what = "Resource") {
    return new ApiError(404, "not_found", `${what} not found.`);
  }
  static conflict(message: string, code = "conflict", details?: unknown) {
    return new ApiError(409, code, message, details);
  }
  /** A business rule blocked the action (e.g. refund requested before the 30-day wait). */
  static rule(code: string, message: string, details?: unknown) {
    return new ApiError(422, code, message, details);
  }
}

/** Maps any thrown value to a status + body. Unknown errors become an opaque 500. */
export function toErrorResponse(err: unknown): { status: ContentfulStatusCode; body: ErrorBody["error"] } {
  if (err instanceof ApiError) {
    return { status: err.status, body: { code: err.code, message: err.message, details: err.details } };
  }
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        code: "validation_failed",
        message: "Some fields are missing or invalid.",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return { status: 409, body: { code: "conflict", message: "That record already exists.", details: { fields: err.meta?.target } } };
    }
    if (err.code === "P2025") {
      return { status: 404, body: { code: "not_found", message: "Resource not found." } };
    }
    if (err.code === "P2003") {
      return { status: 409, body: { code: "conflict", message: "A related record is missing or still in use." } };
    }
  }
  return { status: 500, body: { code: "internal_error", message: "Something went wrong. Please try again." } };
}
