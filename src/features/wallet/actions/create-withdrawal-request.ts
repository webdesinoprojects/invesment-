"use server";

import { refresh } from "next/cache";

import { validationFailure } from "@/features/auth/actions/action-helpers";
import { getWithdrawalSettings } from "@/features/wallet/queries/get-withdrawal-settings";
import { withdrawalRequestSchema } from "@/features/wallet/schemas/withdrawal-request";
import { createWithdrawalRequest } from "@/features/wallet/services/create-withdrawal-request";
import { isWithdrawalOpen } from "@/features/wallet/services/withdrawal-calendar";
import { requireUser } from "@/lib/auth/require-user";
import { getPrisma } from "@/lib/db/prisma";
import { compareDecimalStrings } from "@/lib/money/compare-decimal";
import { verifyUserSecurityPin } from "@/lib/security/verify-user-pin";
import type { ActionResult } from "@/types/action-result";

export async function createWithdrawalRequestAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = withdrawalRequestSchema.safeParse({
    amount: formData.get("amount"),
    securityPin: formData.get("securityPin"),
    requestToken: formData.get("requestToken"),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  const [user, settings] = await Promise.all([requireUser(), getWithdrawalSettings()]);
  if (!settings) return failure("WITHDRAWAL_NOT_CONFIGURED", "Withdrawals are temporarily unavailable.");
  if (!isWithdrawalOpen(settings.allowedDays)) {
    return failure("WITHDRAWAL_CLOSED", "Withdrawals open only on the configured withdrawal dates.");
  }
  if (compareDecimalStrings(parsed.data.amount, settings.minimumAmount) < 0) {
    return {
      ...failure("AMOUNT_TOO_LOW", `Minimum withdrawal is ${settings.minimumAmount} USDT.`),
      fieldErrors: { amount: ["Amount is below the configured minimum."] },
    };
  }

  const profile = await getPrisma().userProfile.findUnique({
    where: { id: user.id },
    select: { bep20WalletAddress: true },
  });
  if (!profile?.bep20WalletAddress) {
    return failure("WALLET_NOT_CONFIGURED", "Add your BEP-20 wallet address in Profile first.");
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
    const result = await createWithdrawalRequest({
      userId: user.id,
      amount: parsed.data.amount,
      requestToken: parsed.data.requestToken,
    });
    if (!result.ok) return mapServiceFailure(result.code);
  } catch {
    return failure("WITHDRAWAL_REQUEST_FAILED", "The withdrawal request could not be submitted. Try again.");
  }

  refresh();
  return {
    ok: true,
    code: "SUCCESS",
    data: undefined,
    message: "Withdrawal requested. The funds are held pending admin review.",
  };
}

function failure(
  code: string,
  message: string,
): Extract<ActionResult, { ok: false }> {
  return { ok: false, code, message };
}

function mapServiceFailure(code: "DUPLICATE_REQUEST" | "INSUFFICIENT_FUNDS" | "WALLET_NOT_CONFIGURED"): ActionResult {
  if (code === "DUPLICATE_REQUEST") return failure(code, "This withdrawal request was already submitted.");
  if (code === "INSUFFICIENT_FUNDS") return failure(code, "Your available balance is insufficient.");
  return failure(code, "Add your BEP-20 wallet address in Profile first.");
}
