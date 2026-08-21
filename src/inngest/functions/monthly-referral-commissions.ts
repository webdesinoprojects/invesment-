import { inngest } from "@/inngest/client";
import {
  getDueCommissionScheduleBatch,
  processMonthlyCommissionScheduleBatch,
} from "@/features/referral/services/process-monthly-commissions";

export const automaticMonthlyReferralCommissions = inngest.createFunction(
  {
    id: "automatic-monthly-referral-commissions",
    name: "Automatic monthly referral commissions",
    retries: 4,
    concurrency: 1,
    singleton: { mode: "skip" },
    triggers: { cron: "TZ=Asia/Kolkata 15 1 * * *" },
  },
  async ({ step }) => {
    const now = new Date();
    let cursor: string | null = null;
    let batch = 0;
    const totals = {
      credited: 0,
      skipped: 0,
      completed: 0,
      cancelled: 0,
    };

    do {
      const page = await step.run(`load-commission-batch-${batch}`, () =>
        getDueCommissionScheduleBatch({ cursor, now }),
      );
      if (page.scheduleIds.length > 0) {
        const results = await step.run(`process-commission-batch-${batch}`, () =>
          processMonthlyCommissionScheduleBatch({ scheduleIds: page.scheduleIds, now }),
        );
        totals.credited += results.credited;
        totals.skipped += results.skipped;
        totals.completed += results.completed;
        totals.cancelled += results.cancelled;
      }
      cursor = page.nextCursor;
      batch += 1;
    } while (cursor);

    return { processed: Object.values(totals).reduce((sum, count) => sum + count, 0), ...totals };
  },
);
