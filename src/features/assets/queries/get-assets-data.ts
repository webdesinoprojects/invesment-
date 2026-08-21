import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { IncomeType } from "@/generated/prisma/enums";
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
  const sumIncome = (...types: IncomeType[]) => types
    .reduce(
      (total, type) => total.plus(incomeByType.get(type) ?? 0),
      new Prisma.Decimal(0),
    )
    .toString();

  return {
    walletBalance: latestWalletEntry?.balanceAfter.toString() ?? "0",
    activeInvestment: activeInvestment._sum.amount?.toString() ?? "0",
    dailyRoi: incomeByType.get("DAILY_ROI") ?? "0",
    directIncome: sumIncome("DIRECT_REFERRAL", "DIRECT_REFERRAL_BONUS", "MONTHLY_DIRECT"),
    levelIncome: sumIncome("LEVEL_INCOME", "MONTHLY_LEVEL"),
    rankIncome: incomeByType.get("RANK_REWARD") ?? "0",
    salaryIncome: incomeByType.get("SALARY") ?? "0",
    totalWithdrawn: withdrawn._sum.amount?.toString() ?? "0",
  };
}
