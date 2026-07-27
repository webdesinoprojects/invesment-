import "server-only";

import type { AssetsData } from "@/features/assets/types/assets";
import { getPrisma } from "@/lib/db/prisma";

export async function getAssetsData(userId: string): Promise<AssetsData> {
  const db = getPrisma();
  const [latestWalletEntry, activeInvestment, income, withdrawn] = await Promise.all([
    db.walletLedgerEntry.findFirst({
      where: { userId },
      orderBy: { sequence: "desc" },
      select: { balanceAfter: true },
    }),
    db.investment.aggregate({
      where: { userId, status: "ACTIVE" },
      _sum: { amount: true },
    }),
    db.incomeLedgerEntry.groupBy({
      by: ["type"],
      where: { userId, status: "CREDITED" },
      _sum: { amount: true },
    }),
    db.withdrawalRequest.aggregate({
      where: { userId, status: "PAID" },
      _sum: { amount: true },
    }),
  ]);

  const incomeByType = new Map(
    income.map((entry) => [entry.type, entry._sum.amount?.toString() ?? "0"]),
  );

  return {
    walletBalance: latestWalletEntry?.balanceAfter.toString() ?? "0",
    activeInvestment: activeInvestment._sum.amount?.toString() ?? "0",
    dailyRoi: incomeByType.get("DAILY_ROI") ?? "0",
    directIncome: incomeByType.get("DIRECT_REFERRAL") ?? "0",
    levelIncome: incomeByType.get("LEVEL_INCOME") ?? "0",
    rankIncome: incomeByType.get("RANK_REWARD") ?? "0",
    salaryIncome: incomeByType.get("SALARY") ?? "0",
    totalWithdrawn: withdrawn._sum.amount?.toString() ?? "0",
  };
}
