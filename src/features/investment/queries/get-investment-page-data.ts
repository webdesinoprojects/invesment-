import "server-only";

import { getInvestmentSettings } from "@/features/investment/queries/get-investment-settings";
import type { InvestmentPageData } from "@/features/investment/types/investment";
import { getPrisma } from "@/lib/db/prisma";

export async function getInvestmentPageData(userId: string): Promise<InvestmentPageData> {
  const db = getPrisma();
  const [settings, latestLedgerEntry, investments] = await Promise.all([
    getInvestmentSettings(),
    db.walletLedgerEntry.findFirst({
      where: { userId },
      orderBy: { sequence: "desc" },
      select: { balanceAfter: true },
    }),
    db.investment.findMany({
      where: { OR: [{ userId }, { fundedByUserId: userId }] },
      orderBy: { activatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        amount: true,
        source: true,
        status: true,
        activatedAt: true,
        user: { select: { memberId: true, fullName: true } },
        fundedBy: { select: { memberId: true } },
      },
    }),
  ]);

  return {
    availableBalance: latestLedgerEntry?.balanceAfter.toString() ?? "0",
    minimumAmount: settings?.minimumAmount ?? null,
    monthlyRoiPercent: settings?.monthlyRoiPercent ?? null,
    durationMonths: settings?.durationMonths ?? null,
    history: investments.map((investment) => ({
      id: investment.id,
      amount: investment.amount.toString(),
      memberId: investment.user.memberId,
      memberName: investment.user.fullName,
      fundedByMemberId: investment.fundedBy?.memberId ?? null,
      source: investment.source,
      status: investment.status,
      activatedAt: investment.activatedAt.toISOString(),
    })),
  };
}
