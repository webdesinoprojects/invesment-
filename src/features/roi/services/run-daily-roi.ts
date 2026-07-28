import "server-only";

import type { RoiRun } from "@/generated/prisma/client";
import { creditDailyRoi } from "@/features/roi/services/credit-daily-roi";
import type { RoiRunResult } from "@/features/roi/types/roi";
import { getIndiaDateKey, getIndiaDateValue } from "@/lib/date/business-day";
import { getPrisma } from "@/lib/db/prisma";

const RUN_LEASE_MS = 20 * 60 * 1000;
const CONCURRENT_USERS = 6;

function hasPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export async function runDailyRoi(now = new Date(), adminId?: string): Promise<RoiRunResult> {
  const dateKey = getIndiaDateKey(now);
  const creditDate = getIndiaDateValue(now);
  const claim = await claimRun(creditDate, now, adminId);

  if (!claim.acquired) {
    return resultFromRun(claim.run, dateKey, claim.run.status === "COMPLETED");
  }

  try {
    return await processClaimedRun(claim.run, creditDate, dateKey);
  } catch {
    await markClaimFailed(claim.run).catch(() => undefined);
    throw new Error("Daily ROI processing failed.");
  }
}

async function processClaimedRun(
  claimedRun: RoiRun,
  creditDate: Date,
  dateKey: string,
): Promise<RoiRunResult> {
  const db = getPrisma();
  const investments = await db.investment.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ userId: "asc" }, { activatedAt: "asc" }],
    select: { id: true, userId: true },
  });
  const investmentsByUser = new Map<string, typeof investments>();
  for (const investment of investments) {
    const group = investmentsByUser.get(investment.userId) ?? [];
    group.push(investment);
    investmentsByUser.set(investment.userId, group);
  }
  const groups = Array.from(investmentsByUser.values());
  const failedInvestmentIds: string[] = [];

  for (let index = 0; index < groups.length; index += CONCURRENT_USERS) {
    const batch = groups.slice(index, index + CONCURRENT_USERS);
    await Promise.all(batch.map(async (userInvestments) => {
      for (const investment of userInvestments) {
        try {
          await creditDailyRoi({
            runId: claimedRun.id,
            investmentId: investment.id,
            creditDate,
            dateKey,
          });
        } catch {
          failedInvestmentIds.push(investment.id);
        }
      }
    }));
  }

  const credited = await db.roiCredit.count({ where: { runId: claimedRun.id } });
  const status = failedInvestmentIds.length > 0 ? "FAILED" : "COMPLETED";
  const completedAt = new Date();
  await db.roiRun.updateMany({
    where: {
      id: claimedRun.id,
      status: "RUNNING",
      startedAt: claimedRun.startedAt,
    },
    data: {
      status,
      processed: investments.length,
      credited,
      failed: failedInvestmentIds.length,
      errorDetail: failedInvestmentIds.length > 0
        ? `Failed investment IDs: ${failedInvestmentIds.slice(0, 10).join(", ")}`
        : null,
      completedAt,
    },
  });

  const run = await db.roiRun.findUniqueOrThrow({ where: { id: claimedRun.id } });
  return resultFromRun(run, dateKey, run.status === "COMPLETED" && run.startedAt > claimedRun.startedAt);
}

async function markClaimFailed(claimedRun: RoiRun): Promise<void> {
  await getPrisma().roiRun.updateMany({
    where: {
      id: claimedRun.id,
      status: "RUNNING",
      startedAt: claimedRun.startedAt,
    },
    data: {
      status: "FAILED",
      failed: 1,
      errorDetail: "ROI run aborted before completion.",
      completedAt: new Date(),
    },
  });
}

async function claimRun(
  runDate: Date,
  now: Date,
  adminId?: string,
): Promise<{ acquired: boolean; run: RoiRun }> {
  const db = getPrisma();

  try {
    const run = await db.roiRun.create({
      data: {
        runDate,
        trigger: adminId ? "MANUAL" : "SCHEDULED",
        triggeredByAdminId: adminId ?? null,
      },
    });
    return { acquired: true, run };
  } catch (error) {
    if (!hasPrismaCode(error, "P2002")) throw error;
  }

  const existing = await db.roiRun.findUniqueOrThrow({ where: { runDate } });
  if (existing.status === "COMPLETED") return { acquired: false, run: existing };

  const staleBefore = new Date(now.getTime() - RUN_LEASE_MS);
  const claimable = existing.status === "FAILED" || existing.startedAt <= staleBefore;
  if (!claimable) return { acquired: false, run: existing };

  const claimed = await db.roiRun.updateMany({
    where: {
      id: existing.id,
      status: existing.status,
      ...(existing.status === "RUNNING" ? { startedAt: { lte: staleBefore } } : {}),
    },
    data: {
      status: "RUNNING",
      processed: 0,
      credited: 0,
      failed: 0,
      errorDetail: null,
      startedAt: now,
      completedAt: null,
      trigger: adminId ? "RETRY" : existing.trigger,
      triggeredByAdminId: adminId ?? existing.triggeredByAdminId,
    },
  });
  if (claimed.count === 0) {
    return {
      acquired: false,
      run: await db.roiRun.findUniqueOrThrow({ where: { id: existing.id } }),
    };
  }

  return {
    acquired: true,
    run: await db.roiRun.findUniqueOrThrow({ where: { id: existing.id } }),
  };
}

function resultFromRun(run: RoiRun, date: string, alreadyCompleted: boolean): RoiRunResult {
  return {
    status: run.status,
    date,
    processed: run.processed,
    credited: run.credited,
    failed: run.failed,
    alreadyCompleted,
  };
}
