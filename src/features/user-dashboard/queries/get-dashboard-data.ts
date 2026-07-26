import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { getServerEnv } from "@/lib/env/server";
import type {
  DashboardData,
  DashboardIncome,
} from "@/features/user-dashboard/types/dashboard";
import { getIndiaBusinessDayBounds } from "@/lib/date/business-day";

export async function getDashboardData(
  userId: string,
  memberId: string,
): Promise<DashboardData> {
  const db = getPrisma();
  const today = getIndiaBusinessDayBounds();

  const [
    latestWalletEntry,
    activeInvestment,
    todayBusiness,
    totalBusiness,
    directTeamCount,
    totalDownlineCount,
    referralLink,
    groupedIncome,
  ] = await Promise.all([
    db.walletLedgerEntry.findFirst({
      where: { userId },
      orderBy: { sequence: "desc" },
      select: { balanceAfter: true },
    }),
    db.investment.aggregate({
      where: { userId, status: "ACTIVE" },
      _sum: { amount: true },
    }),
    db.investment.aggregate({
      where: {
        status: { not: "CANCELLED" },
        activatedAt: { gte: today.start, lt: today.end },
        user: {
          descendantLinks: {
            some: { ancestorId: userId, depth: { gt: 0 } },
          },
        },
      },
      _sum: { amount: true },
    }),
    db.investment.aggregate({
      where: {
        status: { not: "CANCELLED" },
        user: {
          descendantLinks: {
            some: { ancestorId: userId, depth: { gt: 0 } },
          },
        },
      },
      _sum: { amount: true },
    }),
    db.userProfile.count({ where: { sponsorId: userId } }),
    db.referralClosure.count({
      where: { ancestorId: userId, depth: { gt: 0 } },
    }),
    db.referralLink.findUnique({
      where: { userId },
      select: { code: true, isActive: true },
    }),
    db.incomeLedgerEntry.groupBy({
      by: ["type"],
      where: { userId, status: "CREDITED" },
      _sum: { amount: true },
    }),
  ]);

  const income: DashboardIncome = {
    dailyRoi: "0",
    directReferral: "0",
    levelIncome: "0",
    rankRewards: "0",
    salary: "0",
    total: "0",
  };
  let totalIncome = new Prisma.Decimal(0);
  for (const row of groupedIncome) {
    const value = row._sum.amount?.toString() ?? "0";
    totalIncome = totalIncome.plus(value);
    if (row.type === "DAILY_ROI") income.dailyRoi = value;
    if (row.type === "DIRECT_REFERRAL") income.directReferral = value;
    if (row.type === "LEVEL_INCOME") income.levelIncome = value;
    if (row.type === "RANK_REWARD") income.rankRewards = value;
    if (row.type === "SALARY") income.salary = value;
  }
  income.total = totalIncome.toFixed(6);

  const referralCode = referralLink?.code ?? memberId;
  return {
    walletBalance: latestWalletEntry?.balanceAfter.toString() ?? "0",
    activeInvestment: activeInvestment._sum.amount?.toString() ?? "0",
    todayBusiness: todayBusiness._sum.amount?.toString() ?? "0",
    totalBusiness: totalBusiness._sum.amount?.toString() ?? "0",
    directTeamCount,
    totalDownlineCount,
    referralUrl: `${getServerEnv().NEXT_PUBLIC_SITE_URL}/register?ref=${referralCode}`,
    isReferralActive: referralLink?.isActive ?? false,
    income,
  };
}
