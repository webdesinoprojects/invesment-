import "server-only";

import { getPrisma } from "@/lib/db/prisma";
import { runSerializable } from "@/features/admin/shared/transaction";
import { addUtcMonths, creditIncome } from "./commission-schedules";

export const COMMISSION_BATCH_SIZE = 50;

export async function getDueCommissionScheduleBatch({
  cursor,
  now,
  take = COMMISSION_BATCH_SIZE,
}: {
  cursor: string | null;
  now: Date;
  take?: number;
}) {
  const schedules = await getPrisma().referralCommissionSchedule.findMany({
    where: { status: "ACTIVE", nextDueAt: { lte: now } },
    orderBy: { id: "asc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true },
  });
  return {
    scheduleIds: schedules.map((schedule) => schedule.id),
    nextCursor: schedules.length === take ? (schedules.at(-1)?.id ?? null) : null,
  };
}

export async function processMonthlyCommissionSchedule({
  scheduleId,
  now,
}: {
  scheduleId: string;
  now: Date;
}): Promise<"CREDITED" | "SKIPPED" | "COMPLETED" | "CANCELLED"> {
  return runSerializable(async (tx) => {
    const schedule = await tx.referralCommissionSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        investment: { select: { status: true } },
        beneficiary: { select: { status: true } },
      },
    });
    if (!schedule || schedule.status !== "ACTIVE" || !schedule.nextDueAt || schedule.nextDueAt > now) {
      return "SKIPPED";
    }

    if (schedule.investment.status === "CANCELLED") {
      await tx.referralCommissionSchedule.update({
        where: { id: schedule.id },
        data: { status: "CANCELLED", nextDueAt: null, completedAt: now },
      });
      return "CANCELLED";
    }
    if (schedule.investment.status === "COMPLETED" || schedule.paidPeriods >= schedule.maxPeriods) {
      await tx.referralCommissionSchedule.update({
        where: { id: schedule.id },
        data: { status: "COMPLETED", nextDueAt: null, completedAt: now },
      });
      return "COMPLETED";
    }
    if (
      schedule.investment.status !== "ACTIVE" ||
      schedule.beneficiary.status === "BLOCKED" ||
      schedule.beneficiary.status === "ARCHIVED"
    ) {
      return "SKIPPED";
    }

    const period = schedule.paidPeriods + 1;
    await creditIncome(tx, {
      beneficiaryUserId: schedule.beneficiaryUserId,
      sourceUserId: schedule.sourceUserId,
      investmentId: schedule.investmentId,
      commissionScheduleId: schedule.id,
      type: schedule.type === "MONTHLY_LEVEL" ? "MONTHLY_LEVEL" : "MONTHLY_DIRECT",
      level: schedule.type === "MONTHLY_LEVEL" ? 2 : null,
      percent: schedule.percent,
      baseAmount: schedule.baseAmount,
      idempotencyKey: `commission-schedule:${schedule.id}:period:${period}`,
      description:
        schedule.type === "MONTHLY_LEVEL"
          ? `Monthly level-two commission, period ${period}.`
          : `Monthly direct-team commission, period ${period}.`,
    });

    const completed = period >= schedule.maxPeriods;
    await tx.referralCommissionSchedule.update({
      where: { id: schedule.id },
      data: {
        paidPeriods: period,
        nextDueAt: completed ? null : addUtcMonths(schedule.nextDueAt, 1),
        status: completed ? "COMPLETED" : "ACTIVE",
        completedAt: completed ? now : null,
      },
    });
    return completed ? "COMPLETED" : "CREDITED";
  });
}

export async function processMonthlyCommissionScheduleBatch({
  scheduleIds,
  now,
}: {
  scheduleIds: string[];
  now: Date;
}) {
  const results = {
    credited: 0,
    skipped: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const scheduleId of scheduleIds) {
    const result = await processMonthlyCommissionSchedule({ scheduleId, now });
    results[result.toLowerCase() as keyof typeof results] += 1;
  }

  return results;
}
