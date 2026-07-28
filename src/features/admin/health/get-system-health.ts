import "server-only";

import { configurationSchemas } from "@/features/settings/schemas/configuration";
import { getIndiaDateKey, getIndiaDateValue } from "@/lib/date/business-day";
import { getPrisma } from "@/lib/db/prisma";

const requiredSettings = [
  "investment_configuration",
  "withdrawal_configuration",
  "deposit_configuration",
] as const;

export async function getSystemHealth() {
  const prisma = getPrisma();
  const started = performance.now();
  const now = new Date();
  const stalledBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentBusinessDates = Array.from({ length: 7 }, (_, index) =>
    getIndiaDateValue(new Date(now.getTime() - (index + 1) * 24 * 60 * 60 * 1000)),
  );
  const [
    lastSuccess,
    lastFailure,
    lastScheduled,
    stalledWithdrawals,
    overdueDeposits,
    failedRuns,
    settings,
    lastAudit,
    completedDates,
  ] = await Promise.all([
    prisma.roiRun.findFirst({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { runDate: true, completedAt: true },
    }),
    prisma.roiRun.findFirst({
      where: { status: "FAILED" },
      orderBy: { completedAt: "desc" },
      select: { runDate: true, completedAt: true, errorDetail: true },
    }),
    prisma.roiRun.findFirst({
      where: { trigger: "SCHEDULED" },
      orderBy: { startedAt: "desc" },
      select: { runDate: true, status: true, startedAt: true, completedAt: true },
    }),
    prisma.withdrawalRequest.count({
      where: { status: "PROCESSING", processingStartedAt: { lt: stalledBefore } },
    }),
    prisma.depositRequest.count({
      where: { status: "PENDING", submittedAt: { lt: stalledBefore } },
    }),
    prisma.roiRun.count({
      where: { status: "FAILED", completedAt: { gte: stalledBefore } },
    }),
    prisma.systemSetting.findMany({
      where: { key: { in: [...requiredSettings] } },
      select: { key: true, value: true },
    }),
    prisma.auditLog.findFirst({
      where: { outcome: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.roiRun.findMany({
      where: { runDate: { in: recentBusinessDates }, status: "COMPLETED" },
      select: { runDate: true },
    }),
  ]);

  const byKey = new Map(settings.map((setting) => [setting.key, setting.value]));
  const missingSettings = requiredSettings.filter((key) => !byKey.has(key));
  const invalidSettings = requiredSettings.flatMap((key) => {
    const value = byKey.get(key);
    if (value === undefined) return [];
    return configurationSchemas[key].safeParse(value).success ? [] : [key];
  });
  const completed = new Set(completedDates.map((run) => getIndiaDateKey(run.runDate)));
  const missedRoiDates = recentBusinessDates
    .map((date) => getIndiaDateKey(date))
    .filter((date) => !completed.has(date));

  return {
    lastSuccess,
    lastFailure,
    lastScheduled,
    stalledWithdrawals,
    overdueDeposits,
    failedRuns,
    lastAudit,
    latencyMs: Math.round(performance.now() - started),
    missingSettings,
    invalidSettings,
    missedRoiDates,
  };
}
