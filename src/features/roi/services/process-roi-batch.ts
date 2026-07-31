import "server-only";

import { creditDailyRoi } from "@/features/roi/services/credit-daily-roi";
import { getPrisma } from "@/lib/db/prisma";

export const AUTOMATIC_ROI_BATCH_SIZE = 50;
const CONCURRENT_USERS = 5;

export type RoiInvestmentReference = {
  id: string;
  userId: string;
};

export type RoiInvestmentBatch = {
  investments: RoiInvestmentReference[];
  nextCursor: string | null;
};

type Credit = typeof creditDailyRoi;

export async function getActiveInvestmentBatch({
  cursor,
  take = AUTOMATIC_ROI_BATCH_SIZE,
}: {
  cursor: string | null;
  take?: number;
}): Promise<RoiInvestmentBatch> {
  const investments = await getPrisma().investment.findMany({
    where: { status: "ACTIVE" },
    orderBy: { id: "asc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, userId: true },
  });

  return {
    investments,
    nextCursor:
      investments.length === take
        ? (investments.at(-1)?.id ?? null)
        : null,
  };
}

export async function processRoiInvestmentBatch({
  runId,
  creditDate,
  dateKey,
  investments,
  credit = creditDailyRoi,
}: {
  runId: string;
  creditDate: string;
  dateKey: string;
  investments: RoiInvestmentReference[];
  credit?: Credit;
}): Promise<{ failedInvestmentIds: string[] }> {
  const byUser = new Map<string, RoiInvestmentReference[]>();
  for (const investment of investments) {
    const group = byUser.get(investment.userId) ?? [];
    group.push(investment);
    byUser.set(investment.userId, group);
  }

  const groups = Array.from(byUser.values());
  const failedInvestmentIds: string[] = [];

  for (let index = 0; index < groups.length; index += CONCURRENT_USERS) {
    const batch = groups.slice(index, index + CONCURRENT_USERS);
    await Promise.all(
      batch.map(async (userInvestments) => {
        for (const investment of userInvestments) {
          try {
            await credit({
              runId,
              investmentId: investment.id,
              creditDate: new Date(creditDate),
              dateKey,
            });
          } catch {
            failedInvestmentIds.push(investment.id);
          }
        }
      }),
    );
  }

  return { failedInvestmentIds };
}
