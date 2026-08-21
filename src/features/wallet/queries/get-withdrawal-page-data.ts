import "server-only";

import { getPrisma } from "@/lib/db/prisma";
import { getWithdrawalSettings } from "@/features/wallet/queries/get-withdrawal-settings";
import { isWithdrawalOpen } from "@/features/wallet/services/withdrawal-calendar";
import type { WithdrawalPageData } from "@/features/wallet/types/withdrawal";

export async function getWithdrawalPageData(userId: string): Promise<WithdrawalPageData> {
  const db = getPrisma();
  const [settings, profile, latestLedgerEntry, requests] = await Promise.all([
    getWithdrawalSettings(),
    db.userProfile.findUnique({
      where: { id: userId },
      select: { bep20WalletAddress: true },
    }),
    db.walletLedgerEntry.findFirst({
      where: { userId },
      orderBy: { sequence: "desc" },
      select: { balanceAfter: true },
    }),
    db.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      take: 20,
      select: {
        id: true,
        amount: true,
        feeAmount: true,
        netAmount: true,
        walletAddress: true,
        status: true,
        paymentHash: true,
        rejectionReason: true,
        submittedAt: true,
        reviewedAt: true,
      },
    }),
  ]);

  return {
    availableBalance: latestLedgerEntry?.balanceAfter.toString() ?? "0",
    walletAddress: profile?.bep20WalletAddress ?? null,
    minimumAmount: settings?.minimumAmount ?? null,
    feePercent: settings?.feePercent ?? null,
    allowedDays: settings?.allowedDays ?? [],
    isOpen: settings ? isWithdrawalOpen(settings.allowedDays) : false,
    history: requests.map((request) => ({
      id: request.id,
      amount: request.amount.toString(),
      feeAmount: request.feeAmount.toString(),
      netAmount: (request.netAmount ?? request.amount.minus(request.feeAmount)).toString(),
      walletAddress: request.walletAddress,
      status: request.status,
      submittedAt: request.submittedAt.toISOString(),
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
      paymentHash: request.paymentHash,
      rejectionReason: request.rejectionReason,
    })),
  };
}
