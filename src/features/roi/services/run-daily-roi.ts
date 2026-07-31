import "server-only";

import { creditDailyRoi } from "@/features/roi/services/credit-daily-roi";
import {
  getActiveInvestmentBatch,
  processRoiInvestmentBatch,
} from "@/features/roi/services/process-roi-batch";
import {
  claimRoiRun,
  finalizeRoiRun,
  markRoiRunFailed,
  recordRoiRunProgress,
  roiRunResult,
} from "@/features/roi/services/roi-run-state";
import type { RoiRunResult } from "@/features/roi/types/roi";
import {
  getIndiaDateKey,
  getIndiaDateValue,
} from "@/lib/date/business-day";

const MANUAL_BATCH_SIZE = 100;

export async function runDailyRoi(
  now = new Date(),
  adminId?: string,
  options?: { credit?: typeof creditDailyRoi },
): Promise<RoiRunResult> {
  const dateKey = getIndiaDateKey(now);
  const creditDate = getIndiaDateValue(now);
  const claim = await claimRoiRun({
    runDate: creditDate,
    now,
    ...(adminId ? { adminId } : {}),
  });

  if (!claim.acquired) {
    return roiRunResult(
      claim.run,
      false,
      claim.run.status === "COMPLETED",
    );
  }

  let cursor: string | null = null;
  let processed = 0;
  const failedInvestmentIds: string[] = [];

  try {
    do {
      const batch = await getActiveInvestmentBatch({
        cursor,
        take: MANUAL_BATCH_SIZE,
      });
      processed += batch.investments.length;

      const result = await processRoiInvestmentBatch({
        runId: claim.run.id,
        creditDate: creditDate.toISOString(),
        dateKey,
        investments: batch.investments,
        credit: options?.credit ?? creditDailyRoi,
      });
      failedInvestmentIds.push(...result.failedInvestmentIds);
      await recordRoiRunProgress({
        run: claim.run,
        processed,
        failed: failedInvestmentIds.length,
      });
      cursor = batch.nextCursor;
    } while (cursor);

    return await finalizeRoiRun({
      run: claim.run,
      processed,
      failedInvestmentIds,
    });
  } catch {
    await markRoiRunFailed(claim.run).catch(() => undefined);
    throw new Error("Daily ROI processing failed.");
  }
}
