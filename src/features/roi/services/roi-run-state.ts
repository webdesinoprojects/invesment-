import "server-only";

import type { RoiRun } from "@/generated/prisma/client";
import type { RoiRunResult } from "@/features/roi/types/roi";
import { getIndiaDateKey } from "@/lib/date/business-day";
import { getPrisma } from "@/lib/db/prisma";

const RUN_LEASE_MS = 2 * 60 * 60 * 1000;

export type RoiRunSnapshot = {
  id: string;
  runDate: string;
  dateKey: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  processed: number;
  credited: number;
  failed: number;
  startedAt: string;
};

export type RoiRunClaim = {
  acquired: boolean;
  run: RoiRunSnapshot;
};

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function snapshot(run: RoiRun): RoiRunSnapshot {
  return {
    id: run.id,
    runDate: run.runDate.toISOString(),
    dateKey: getIndiaDateKey(run.runDate),
    status: run.status,
    processed: run.processed,
    credited: run.credited,
    failed: run.failed,
    startedAt: run.startedAt.toISOString(),
  };
}

export async function claimRoiRun({
  runDate,
  now,
  adminId,
}: {
  runDate: Date;
  now: Date;
  adminId?: string;
}): Promise<RoiRunClaim> {
  const db = getPrisma();

  try {
    const run = await db.roiRun.create({
      data: {
        runDate,
        trigger: adminId ? "MANUAL" : "SCHEDULED",
        triggeredByAdminId: adminId ?? null,
      },
    });
    return { acquired: true, run: snapshot(run) };
  } catch (error) {
    if (!hasPrismaCode(error, "P2002")) throw error;
  }

  const existing = await db.roiRun.findUniqueOrThrow({ where: { runDate } });
  if (existing.status === "COMPLETED") {
    return { acquired: false, run: snapshot(existing) };
  }

  const staleBefore = new Date(now.getTime() - RUN_LEASE_MS);
  const claimable =
    existing.status === "FAILED" || existing.startedAt <= staleBefore;
  if (!claimable) {
    return { acquired: false, run: snapshot(existing) };
  }

  const claimed = await db.roiRun.updateMany({
    where: {
      id: existing.id,
      status: existing.status,
      ...(existing.status === "RUNNING"
        ? { startedAt: { lte: staleBefore } }
        : {}),
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
      run: snapshot(
        await db.roiRun.findUniqueOrThrow({ where: { id: existing.id } }),
      ),
    };
  }

  return {
    acquired: true,
    run: snapshot(
      await db.roiRun.findUniqueOrThrow({ where: { id: existing.id } }),
    ),
  };
}

export async function finalizeRoiRun({
  run,
  processed,
  failedInvestmentIds,
}: {
  run: RoiRunSnapshot;
  processed: number;
  failedInvestmentIds: string[];
}): Promise<RoiRunResult> {
  const db = getPrisma();
  const credited = await db.roiCredit.count({ where: { runId: run.id } });
  const status = failedInvestmentIds.length > 0 ? "FAILED" : "COMPLETED";
  const completedAt = new Date();

  await db.roiRun.updateMany({
    where: {
      id: run.id,
      status: "RUNNING",
      startedAt: new Date(run.startedAt),
    },
    data: {
      status,
      processed,
      credited,
      failed: failedInvestmentIds.length,
      errorDetail:
        failedInvestmentIds.length > 0
          ? `Failed investment IDs: ${failedInvestmentIds
              .slice(0, 10)
              .join(", ")}`
          : null,
      completedAt,
    },
  });

  const updated = await db.roiRun.findUniqueOrThrow({ where: { id: run.id } });
  return roiRunResult(snapshot(updated), true, false);
}

export async function recordRoiRunProgress({
  run,
  processed,
  failed,
}: {
  run: RoiRunSnapshot;
  processed: number;
  failed: number;
}): Promise<void> {
  const db = getPrisma();
  const credited = await db.roiCredit.count({ where: { runId: run.id } });

  await db.roiRun.updateMany({
    where: {
      id: run.id,
      status: "RUNNING",
      startedAt: new Date(run.startedAt),
    },
    data: {
      processed,
      credited,
      failed,
    },
  });
}

export async function markRoiRunFailed(
  run: RoiRunSnapshot,
  detail = "ROI workflow aborted before completion.",
): Promise<void> {
  await getPrisma().roiRun.updateMany({
    where: {
      id: run.id,
      status: "RUNNING",
      startedAt: new Date(run.startedAt),
    },
    data: {
      status: "FAILED",
      failed: 1,
      errorDetail: detail,
      completedAt: new Date(),
    },
  });
}

export function roiRunResult(
  run: RoiRunSnapshot,
  executed: boolean,
  alreadyCompleted: boolean,
): RoiRunResult {
  return {
    status: run.status,
    date: run.dateKey,
    processed: run.processed,
    credited: run.credited,
    failed: run.failed,
    executed,
    alreadyCompleted,
  };
}
