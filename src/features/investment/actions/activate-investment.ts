"use server";

import { refresh } from "next/cache";

import { validationFailure } from "@/features/auth/actions/action-helpers";
import { getInvestmentSettings } from "@/features/investment/queries/get-investment-settings";
import { activationSchema } from "@/features/investment/schemas/activation";
import { activateInvestment } from "@/features/investment/services/activate-investment";
import type { ActivateInvestmentResult } from "@/features/investment/types/investment";
import { requireUser } from "@/lib/auth/require-user";
import { compareDecimalStrings } from "@/lib/money/compare-decimal";
import { verifyUserSecurityPin } from "@/lib/security/verify-user-pin";
import type { ActionResult } from "@/types/action-result";

export async function activateInvestmentAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = activationSchema.safeParse({
    memberId: formData.get("memberId"),
    amount: formData.get("amount"),
    securityPin: formData.get("securityPin"),
    requestToken: formData.get("requestToken"),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  const [user, settings] = await Promise.all([requireUser(), getInvestmentSettings()]);
  if (!settings) return failure("INVESTMENT_NOT_CONFIGURED", "Investments are temporarily unavailable.");
  if (compareDecimalStrings(parsed.data.amount, settings.minimumAmount) < 0) {
    return {
      ...failure("AMOUNT_TOO_LOW", `Minimum investment is ${settings.minimumAmount} USDT.`),
      fieldErrors: { amount: ["Amount is below the configured minimum."] },
    };
  }

  const pinVerification = await verifyUserSecurityPin(user.id, parsed.data.securityPin);
  if (pinVerification.status === "LOCKED") {
    return {
      ...failure("SECURITY_PIN_LOCKED", "Security PIN is temporarily locked. Try again in 15 minutes."),
      fieldErrors: { securityPin: ["Too many incorrect attempts."] },
    };
  }
  if (pinVerification.status === "INVALID") {
    return {
      ...failure(
        "INVALID_SECURITY_PIN",
        `The security PIN is incorrect. ${pinVerification.remainingAttempts} attempts remaining.`,
      ),
      fieldErrors: { securityPin: ["Incorrect security PIN."] },
    };
  }

  try {
    const result = await activateInvestment({
      payerUserId: user.id,
      targetMemberId: parsed.data.memberId,
      amount: parsed.data.amount,
      requestToken: parsed.data.requestToken,
      settings,
    });
    if (!result.ok) return mapServiceFailure(result.code);
  } catch {
    return failure("ACTIVATION_FAILED", "The investment could not be activated. Try again.");
  }

  refresh();
  return {
    ok: true,
    code: "SUCCESS",
    data: undefined,
    message: "Investment activated and commissions credited.",
  };
}

function failure(code: string, message: string): Extract<ActionResult, { ok: false }> {
  return { ok: false, code, message };
}

function mapServiceFailure(code: Exclude<ActivateInvestmentResult, { ok: true }>["code"]): ActionResult {
  if (code === "DUPLICATE_REQUEST") return failure(code, "This activation was already submitted.");
  if (code === "INSUFFICIENT_FUNDS") return failure(code, "Your available balance is insufficient.");
  if (code === "MEMBER_NOT_FOUND") return failure(code, "The member ID does not exist.");
  return failure(code, "This member cannot be activated.");
}
