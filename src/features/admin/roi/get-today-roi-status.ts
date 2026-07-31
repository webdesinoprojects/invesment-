import "server-only";

import { getIndiaDateValue } from "@/lib/date/business-day";
import { getPrisma } from "@/lib/db/prisma";
import {
  isAutomaticRoiExpected,
  isRoiRunStalled,
} from "@/features/admin/roi/roi-schedule";

export async function getTodayRoiStatus(now = new Date()) {
  const run = await getPrisma().roiRun.findUnique({
    where: { runDate: getIndiaDateValue(now) },
    select: {
      id: true,
      status: true,
      trigger: true,
      processed: true,
      credited: true,
      failed: true,
      errorDetail: true,
      startedAt: true,
      completedAt: true,
    },
  });
  const expected = isAutomaticRoiExpected(now);
  const stalled =
    run?.status === "RUNNING" && isRoiRunStalled(run.startedAt, now);

  return {
    run,
    expected,
    stalled,
    requiresAttention:
      (expected && !run) || run?.status === "FAILED" || stalled,
  };
}

export type TodayRoiStatus = Awaited<
  ReturnType<typeof getTodayRoiStatus>
>;
