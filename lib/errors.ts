import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { logger } from "./logger";

/** Errors that are safe to show to end users. */
export class AppError extends Error {
  constructor(message: string, public code: string = "BAD_REQUEST", public status = 400) {
    super(message);
    this.name = "AppError";
  }
}
export class AuthError extends AppError {
  constructor(message = "Please sign in to continue.") {
    super(message, "UNAUTHENTICATED", 401);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do that.") {
    super(message, "FORBIDDEN", 403);
  }
}
export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super(message, "NOT_FOUND", 404);
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

/** Convert any thrown error into a user-safe ActionResult, logging unexpected ones. */
export function toActionError(err: unknown, context: string): { ok: false; error: string; code?: string; fieldErrors?: Record<string, string> } {
  // Next.js redirect()/notFound() must propagate
  if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: unknown }).digest === "string" && (err as { digest: string }).digest.startsWith("NEXT_")) {
    throw err;
  }
  if (err instanceof AppError) return { ok: false, error: err.message, code: err.code };
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const k = issue.path.join(".") || "form";
      if (!fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { ok: false, error: err.issues[0]?.message ?? "Please check the form.", code: "VALIDATION", fieldErrors };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = (err.meta?.target as string[] | undefined)?.join(", ");
    return { ok: false, error: `That ${target ?? "value"} is already in use.`, code: "CONFLICT" };
  }
  logger.error(context, err);
  return { ok: false, error: "Something went wrong on our side. Please try again.", code: "INTERNAL" };
}

/** Wrap a server action body with uniform error handling. */
export async function action<T>(context: string, fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, message };
  } catch (err) {
    return toActionError(err, context);
  }
}
