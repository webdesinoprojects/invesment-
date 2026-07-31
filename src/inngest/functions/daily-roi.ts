import { inngest } from "@/inngest/client";
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
  type RoiRunSnapshot,
} from "@/features/roi/services/roi-run-state";
import {
  getIndiaDateKey,
  getIndiaDateValue,
} from "@/lib/date/business-day";

const BATCH_RETRY_ATTEMPTS = 3;

export const automaticDailyRoi = inngest.createFunction(
  {
    id: "automatic-daily-roi",
    name: "Automatic daily ROI",
    retries: 4,
    concurrency: 1,
    singleton: { mode: "skip" },
    triggers: { cron: "TZ=Asia/Kolkata 30 0 * * *" },
  },
  async ({ event, step }) => {
    const scheduledAt = new Date(event.ts);
    const runDate = getIndiaDateValue(scheduledAt);
    const dateKey = getIndiaDateKey(scheduledAt);
    let claimedRun: RoiRunSnapshot | null = null;

    try {
      const claim = await step.run("claim-daily-roi-run", () =>
        claimRoiRun({
          runDate,
          now: new Date(),
        }),
      );

      if (!claim.acquired) {
        return roiRunResult(
          claim.run,
          false,
          claim.run.status === "COMPLETED",
        );
      }

      claimedRun = claim.run;
      let cursor: string | null = null;
      let batchIndex = 0;
      let processed = 0;
      const failedInvestmentIds: string[] = [];

      do {
        const batch = await step.run(`load-roi-batch-${batchIndex}`, () =>
          getActiveInvestmentBatch({ cursor }),
        );
        processed += batch.investments.length;

        let pending = batch.investments;
        for (
          let attempt = 1;
          attempt <= BATCH_RETRY_ATTEMPTS && pending.length > 0;
          attempt += 1
        ) {
          const result = await step.run(
            `credit-roi-batch-${batchIndex}-attempt-${attempt}`,
            () =>
              processRoiInvestmentBatch({
                runId: claim.run.id,
                creditDate: claim.run.runDate,
                dateKey,
                investments: pending,
              }),
          );
          const failed = new Set(result.failedInvestmentIds);
          pending = pending.filter((investment) => failed.has(investment.id));
        }

        failedInvestmentIds.push(
          ...pending.map((investment) => investment.id),
        );
        await step.run(`record-roi-progress-${batchIndex}`, () =>
          recordRoiRunProgress({
            run: claim.run,
            processed,
            failed: failedInvestmentIds.length,
          }),
        );
        cursor = batch.nextCursor;
        batchIndex += 1;
      } while (cursor);

      return await step.run("finalize-daily-roi-run", () =>
        finalizeRoiRun({
          run: claim.run,
          processed,
          failedInvestmentIds,
        }),
      );
    } catch (error) {
      if (claimedRun) {
        const runToFail = claimedRun;
        const detail =
          error instanceof Error
            ? `Automatic ROI workflow failed: ${error.message}`
            : "Automatic ROI workflow failed unexpectedly.";
        await step.run("mark-daily-roi-run-failed", () =>
          markRoiRunFailed(runToFail, detail),
        );
      }
      throw error;
    }
  },
);
