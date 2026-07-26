import "server-only";

import QRCode from "qrcode";

import { getPrisma } from "@/lib/db/prisma";
import type { DepositPageData } from "@/features/wallet/types/deposit";

import { getDepositSettings } from "./get-deposit-settings";

export async function getDepositPageData(userId: string): Promise<DepositPageData> {
  const [settings, requests] = await Promise.all([
    getDepositSettings(),
    getPrisma().depositRequest.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      take: 20,
      select: {
        id: true,
        amount: true,
        transactionHash: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        rejectionReason: true,
      },
    }),
  ]);

  const wallet = settings
    ? {
        address: settings.walletAddress,
        network: settings.network,
        minimumAmount: settings.minimumAmount,
        qrDataUrl: await QRCode.toDataURL(settings.walletAddress, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 320,
        }),
      }
    : null;

  return {
    wallet,
    history: requests.map((request) => ({
      id: request.id,
      amount: request.amount.toString(),
      transactionHash: request.transactionHash,
      status: request.status,
      submittedAt: request.submittedAt.toISOString(),
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
      rejectionReason: request.rejectionReason,
    })),
  };
}
