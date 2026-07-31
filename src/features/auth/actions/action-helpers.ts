import type { z } from "zod";

import type { ActionResult } from "@/types/action-result";

export function validationFailure<T = undefined>(
  error: z.ZodError,
): ActionResult<T> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    fieldErrors[field] ??= [];
    fieldErrors[field].push(issue.message);
  }

  return {
    ok: false,
    code: "VALIDATION_ERROR",
    message: "Check the highlighted fields and try again.",
    fieldErrors,
  };
}

export function serviceUnavailable<T = undefined>(): ActionResult<T> {
  return {
    ok: false,
    code: "SERVICE_UNAVAILABLE",
    message:
      "Authentication is not configured yet. Add the Supabase and database environment values first.",
  };
}
