"use server";

import { refresh } from "next/cache";

import { validationFailure } from "@/features/auth/actions/action-helpers";
import { depositRequestSchema } from "@/features/wallet/schemas/deposit-request";
import { getDepositSettings } from "@/features/wallet/queries/get-deposit-settings";
import { requireUser } from "@/lib/auth/require-user";
import { getPrisma } from "@/lib/db/prisma";
import { compareDecimalStrings } from "@/lib/money/compare-decimal";
import type { ActionResult } from "@/types/action-result";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function createDepositRequestAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = depositRequestSchema.safeParse({
    amount: formData.get("amount"),
    transactionHash: formData.get("transactionHash"),
  });
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const [user, settings] = await Promise.all([
    requireUser(),
    getDepositSettings(),
  ]);
  if (!settings) {
    return {
      ok: false,
      code: "DEPOSIT_NOT_CONFIGURED",
      message: "Deposits are temporarily unavailable.",
    };
  }
  if (compareDecimalStrings(parsed.data.amount, settings.minimumAmount) < 0) {
    return {
      ok: false,
      code: "AMOUNT_TOO_LOW",
      message: `Minimum deposit is ${settings.minimumAmount} USDT.`,
      fieldErrors: { amount: ["Amount is below the configured minimum."] },
    };
  }

  try {
    await getPrisma().depositRequest.create({
      data: {
        userId: user.id,
        amount: parsed.data.amount,
        network: settings.network,
        transactionHash: parsed.data.transactionHash.toLowerCase(),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        code: "DUPLICATE_TRANSACTION",
        message: "This transaction hash has already been submitted.",
      };
    }
    return {
      ok: false,
      code: "DEPOSIT_REQUEST_FAILED",
      message: "The deposit request could not be submitted. Try again.",
    };
  }

  refresh();
  return {
    ok: true,
    code: "SUCCESS",
    data: undefined,
    message: "Deposit submitted for admin verification.",
  };
}
