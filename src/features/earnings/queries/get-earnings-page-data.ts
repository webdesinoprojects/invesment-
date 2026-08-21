import "server-only";

import type { IncomeType } from "@/generated/prisma/enums";
import type { EarningsPageData, EarningsTab } from "@/features/earnings/types/earnings";
import { getPrisma } from "@/lib/db/prisma";

const PAGE_SIZE = 20;

const typesByTab: Record<EarningsTab, IncomeType[]> = {
  roi: ["DAILY_ROI"],
  referral: ["DIRECT_REFERRAL", "DIRECT_REFERRAL_BONUS", "MONTHLY_DIRECT"],
  level: ["LEVEL_INCOME", "MONTHLY_LEVEL"],
  rank: ["RANK_REWARD"],
};

export async function getEarningsPageData({
  userId,
  tab,
  requestedPage,
}: {
  userId: string;
  tab: EarningsTab;
  requestedPage: number;
}): Promise<EarningsPageData> {
  const db = getPrisma();
  const where = { userId, type: { in: typesByTab[tab] }, status: "CREDITED" as const };
  const [aggregate, totalRows] = await Promise.all([
    db.incomeLedgerEntry.aggregate({ where, _sum: { amount: true } }),
    db.incomeLedgerEntry.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const entries = await db.incomeLedgerEntry.findMany({
    where,
    orderBy: { creditedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      creditedAt: true,
      description: true,
      amount: true,
      level: true,
      percent: true,
      sourceUser: { select: { memberId: true } },
    },
  });

  return {
    totalIncome: aggregate._sum.amount?.toString() ?? "0",
    rows: entries.map((entry) => ({
      id: entry.id,
      creditedAt: entry.creditedAt.toISOString(),
      description: entry.description,
      amount: entry.amount.toString(),
      sourceMemberId: entry.sourceUser?.memberId ?? null,
      level: entry.level,
      percent: entry.percent?.toString() ?? null,
    })),
    pagination: { page, totalPages, totalRows },
  };
}
