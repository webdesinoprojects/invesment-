"use server";

import { registerSchema } from "@/features/auth/schemas/auth";
import { registerUser } from "@/features/auth/services/register-user";
import { isAuthConfigured } from "@/lib/env/server";
import type { ActionResult } from "@/types/action-result";

import { serviceUnavailable, validationFailure } from "./action-helpers";

export async function registerAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    inviteId: formData.get("inviteId"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    countryCode: formData.get("countryCode"),
    mobile: formData.get("mobile"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    securityPin: formData.get("securityPin"),
  });
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }
  if (!isAuthConfigured()) {
    return serviceUnavailable();
  }

  try {
    const result = await registerUser(parsed.data);
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      code: "SUCCESS",
      data: undefined,
      message: `Account created. Your login ID is ${result.memberId}.`,
    };
  } catch {
    return {
      ok: false,
      code: "REGISTER_FAILED",
      message: "Registration is temporarily unavailable. Please try again.",
    };
  }
}
