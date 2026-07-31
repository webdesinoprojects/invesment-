"use server";

import { validationFailure } from "@/features/auth/actions/action-helpers";
import { securityPinChangeSchema } from "@/features/profile/schemas/profile";
import { requireUser } from "@/lib/auth/require-user";
import { getPrisma } from "@/lib/db/prisma";
import { hashSecurityPin } from "@/lib/security/pin";
import { verifyUserSecurityPin } from "@/lib/security/verify-user-pin";
import type { ActionResult } from "@/types/action-result";

export async function updateSecurityPinAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = securityPinChangeSchema.safeParse({
    currentSecurityPin: formData.get("currentSecurityPin"),
    newSecurityPin: formData.get("newSecurityPin"),
    confirmSecurityPin: formData.get("confirmSecurityPin"),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  const user = await requireUser();
  const verification = await verifyUserSecurityPin(user.id, parsed.data.currentSecurityPin);
  if (verification.status === "LOCKED") {
    return {
      ...failure("SECURITY_PIN_LOCKED", "Security PIN is temporarily locked. Try again in 15 minutes."),
      fieldErrors: { currentSecurityPin: ["Too many incorrect attempts."] },
    };
  }
  if (verification.status === "INVALID") {
    return {
      ...failure(
        "INVALID_SECURITY_PIN",
        `The current security PIN is incorrect. ${verification.remainingAttempts} attempts remaining.`,
      ),
      fieldErrors: { currentSecurityPin: ["Incorrect current security PIN."] },
    };
  }

  const securityPinHash = await hashSecurityPin(parsed.data.newSecurityPin);
  try {
    await getPrisma().$transaction([
      getPrisma().userProfile.update({
        where: { id: user.id },
        data: {
          securityPinHash,
          securityPinFailedAttempts: 0,
          securityPinLockedUntil: null,
        },
      }),
      getPrisma().auditLog.create({
        data: {
          actorType: "SYSTEM",
          targetUserId: user.id,
          action: "USER_SECURITY_PIN_UPDATED",
          entityType: "UserProfile",
          entityId: user.id,
        },
      }),
    ]);
  } catch {
    return failure("SECURITY_PIN_UPDATE_FAILED", "Security PIN could not be updated. Try again.");
  }

  return {
    ok: true,
    code: "SUCCESS",
    data: undefined,
    message: "Security PIN updated.",
  };
}

function failure(code: string, message: string): Extract<ActionResult, { ok: false }> {
  return { ok: false, code, message };
}
