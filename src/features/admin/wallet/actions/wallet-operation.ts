"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireAdminPermission } from "@/server/permissions/admin-permissions";

import type { AdminActionResult } from "../../shared/action-result";
import {
  walletAdjustmentSchema,
  walletReversalSchema,
} from "../schemas/wallet-operation";
import {
  adjustWallet,
  reverseWalletEntry,
} from "../services/wallet-operation";

type WalletActionData = { nextIdempotencyKey: string | null };

export async function adjustWalletAction(
  _state: AdminActionResult<WalletActionData>,
  formData: FormData,
): Promise<AdminActionResult<WalletActionData>> {
  const parsed = walletAdjustmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Check the earnings debit, reason and explicit confirmation.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const admin = await requireAdminPermission("wallet.adjust");
  try {
    const result = await adjustWallet({ ...parsed.data, adminId: admin.adminId });
    if (!result.ok) return walletFailure(result.code);
    revalidatePath("/admin");
    return {
      ok: true,
      data: { nextIdempotencyKey: randomUUID() },
      message: `Earnings adjusted. New available balance: ${result.balanceAfter} USDT.`,
    };
  } catch {
    return { ok: false, code: "FAILED", message: "Wallet adjustment failed safely." };
  }
}

export async function reverseWalletEntryAction(
  _state: AdminActionResult<WalletActionData>,
  formData: FormData,
): Promise<AdminActionResult<WalletActionData>> {
  const parsed = walletReversalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "A reason and explicit reversal confirmation are required.",
    };
  }
  const admin = await requireAdminPermission("wallet.adjust");
  try {
    const result = await reverseWalletEntry({ ...parsed.data, adminId: admin.adminId });
    if (!result.ok) return walletFailure(result.code);
    revalidatePath("/admin/wallet-ledger");
    return {
      ok: true,
      data: { nextIdempotencyKey: randomUUID() },
      message: `Adjustment reversed. New balance: ${result.balanceAfter} USDT.`,
    };
  } catch {
    return { ok: false, code: "FAILED", message: "Wallet reversal failed safely." };
  }
}

function walletFailure(code: string): Extract<AdminActionResult<WalletActionData>, { ok: false }> {
  const messages: Record<string, string> = {
    NOT_FOUND: "The member or ledger entry was not found.",
    INSUFFICIENT_FUNDS: "The wallet has insufficient balance for this operation.",
    DUPLICATE_REQUEST: "This operation was already submitted.",
    CREDIT_REQUIRES_INVESTMENT:
      "Positive administrator credits must be posted as active investments.",
    NOT_REVERSIBLE: "Only unreversed administrator adjustments are eligible for reversal.",
    ALREADY_REVERSED: "This adjustment has already been reversed.",
  };
  return { ok: false, code, message: messages[code] ?? "Wallet operation was rejected." };
}
