"use server";

import { registerSchema } from "@/features/auth/schemas/auth";
import { registerUser } from "@/features/auth/services/register-user";
import type { RegistrationReceiptData } from "@/features/auth/types/registration";
import { isAuthConfigured } from "@/lib/env/server";
import type { ActionResult } from "@/types/action-result";

import { serviceUnavailable, validationFailure } from "./action-helpers";

export async function registerAction(
  _previousState: ActionResult<RegistrationReceiptData>,
  formData: FormData,
): Promise<ActionResult<RegistrationReceiptData>> {
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
    return validationFailure<RegistrationReceiptData>(parsed.error);
  }
  if (!isAuthConfigured()) {
    return serviceUnavailable<RegistrationReceiptData>();
  }

  try {
    const result = await registerUser(parsed.data);
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      code: "SUCCESS",
      data: {
        memberId: result.memberId,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        joinedAt: result.joinedAt,
      },
      message: "Account created successfully.",
    };
  } catch {
    return {
      ok: false,
      code: "REGISTER_FAILED",
      message: "Registration is temporarily unavailable. Please try again.",
    };
  }
}
