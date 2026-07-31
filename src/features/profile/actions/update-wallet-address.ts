"use server";

import { refresh } from "next/cache";

import { validationFailure } from "@/features/auth/actions/action-helpers";
import { walletAddressSchema } from "@/features/profile/schemas/profile";
import { requireUser } from "@/lib/auth/require-user";
import { getPrisma } from "@/lib/db/prisma";
import type { ActionResult } from "@/types/action-result";

export async function updateWalletAddressAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = walletAddressSchema.safeParse({
    walletAddress: formData.get("walletAddress"),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  const user = await requireUser();
  const walletAddress = parsed.data.walletAddress || null;

  try {
    await getPrisma().$transaction(async (transaction) => {
      const current = await transaction.userProfile.findUniqueOrThrow({
        where: { id: user.id },
        select: { bep20WalletAddress: true },
      });

      await transaction.userProfile.update({
        where: { id: user.id },
        data: { bep20WalletAddress: walletAddress },
      });
      await transaction.auditLog.create({
        data: {
          actorType: "SYSTEM",
          targetUserId: user.id,
          action: "USER_WALLET_ADDRESS_UPDATED",
          entityType: "UserProfile",
          entityId: user.id,
          before: { walletAddress: current.bep20WalletAddress },
          after: { walletAddress },
        },
      });
    });
  } catch {
    return failure("PROFILE_UPDATE_FAILED", "Wallet address could not be updated. Try again.");
  }

  refresh();
  return {
    ok: true,
    code: "SUCCESS",
    data: undefined,
    message: walletAddress ? "Wallet address updated." : "Wallet address removed.",
  };
}

function failure(code: string, message: string): Extract<ActionResult, { ok: false }> {
  return { ok: false, code, message };
}
