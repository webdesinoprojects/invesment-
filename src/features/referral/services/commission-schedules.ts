import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { InvestmentSettings } from "@/features/investment/queries/get-investment-settings";

type TransactionClient = Prisma.TransactionClient;

function addUtcMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const finalDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, finalDay));
  return result;
}

function remainingCommissionPeriods(
  activatedAt: Date,
  durationMonths: number,
  startedAt: Date,
): number {
  const expiresAt = addUtcMonths(activatedAt, durationMonths);
  if (startedAt >= expiresAt) return 0;

  let periods = 1;
  let nextPaymentAt = addUtcMonths(startedAt, 1);
  while (nextPaymentAt < expiresAt) {
    periods += 1;
    nextPaymentAt = addUtcMonths(nextPaymentAt, 1);
  }
  return periods;
}

async function creditIncome(
  tx: TransactionClient,
  input: {
    beneficiaryUserId: string;
    sourceUserId: string;
    investmentId: string;
    commissionScheduleId?: string;
    type: "DIRECT_REFERRAL_BONUS" | "MONTHLY_DIRECT" | "MONTHLY_LEVEL";
    level: number | null;
    percent: Prisma.Decimal;
    baseAmount: Prisma.Decimal;
    idempotencyKey: string;
    description: string;
  },
): Promise<void> {
  const amount = input.baseAmount
    .mul(input.percent)
    .div(100)
    .toDecimalPlaces(6, Prisma.Decimal.ROUND_HALF_UP);
  if (amount.isZero()) return;

  const existing = await tx.incomeLedgerEntry.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { id: true },
  });
  if (existing) return;

  const latest = await tx.walletLedgerEntry.findFirst({
    where: { userId: input.beneficiaryUserId },
    orderBy: { sequence: "desc" },
    select: { balanceAfter: true },
  });
  const balance = latest?.balanceAfter ?? new Prisma.Decimal(0);

  const income = await tx.incomeLedgerEntry.create({
    data: {
      userId: input.beneficiaryUserId,
      sourceUserId: input.sourceUserId,
      investmentId: input.investmentId,
      commissionScheduleId: input.commissionScheduleId ?? null,
      type: input.type,
      level: input.level,
      percent: input.percent,
      baseAmount: input.baseAmount,
      amount,
      idempotencyKey: input.idempotencyKey,
      description: input.description,
    },
    select: { id: true },
  });

  await tx.walletLedgerEntry.create({
    data: {
      userId: input.beneficiaryUserId,
      direction: "CREDIT",
      category: input.type === "MONTHLY_LEVEL" ? "LEVEL" : "REFERRAL",
      amount,
      balanceAfter: balance.plus(amount),
      referenceType: "IncomeLedgerEntry",
      referenceId: income.id,
      idempotencyKey: `income-credit:${income.id}`,
      description: input.description,
    },
  });
}

export async function creditDirectActivationBonus(
  tx: TransactionClient,
  input: {
    sourceUserId: string;
    investmentId: string;
    baseAmount: Prisma.Decimal;
    percent: string;
  },
): Promise<void> {
  const source = await tx.userProfile.findUnique({
    where: { id: input.sourceUserId },
    select: { sponsor: { select: { id: true, status: true } } },
  });
  const sponsor = source?.sponsor;
  if (!sponsor || sponsor.status === "BLOCKED" || sponsor.status === "ARCHIVED") return;

  await creditIncome(tx, {
    beneficiaryUserId: sponsor.id,
    sourceUserId: input.sourceUserId,
    investmentId: input.investmentId,
    type: "DIRECT_REFERRAL_BONUS",
    level: null,
    percent: new Prisma.Decimal(input.percent),
    baseAmount: input.baseAmount,
    idempotencyKey: `direct-bonus:${input.sourceUserId}:${sponsor.id}`,
    description: "One-time direct referral bonus.",
  });
}

async function createScheduleWithInitialCredit(
  tx: TransactionClient,
  input: {
    beneficiaryUserId: string;
    sourceUserId: string;
    investmentId: string;
    type: "MONTHLY_DIRECT" | "MONTHLY_LEVEL";
    percent: string;
    baseAmount: Prisma.Decimal;
    maxPeriods: number;
  },
): Promise<void> {
  const existing = await tx.referralCommissionSchedule.findUnique({
    where: {
      beneficiaryUserId_investmentId_type: {
        beneficiaryUserId: input.beneficiaryUserId,
        investmentId: input.investmentId,
        type: input.type,
      },
    },
    select: { id: true },
  });
  if (existing) return;

  const startedAt = new Date();
  const schedule = await tx.referralCommissionSchedule.create({
    data: {
      beneficiaryUserId: input.beneficiaryUserId,
      sourceUserId: input.sourceUserId,
      investmentId: input.investmentId,
      type: input.type,
      percent: new Prisma.Decimal(input.percent),
      baseAmount: input.baseAmount,
      paidPeriods: 1,
      maxPeriods: input.maxPeriods,
      nextDueAt: input.maxPeriods > 1 ? addUtcMonths(startedAt, 1) : null,
      status: input.maxPeriods > 1 ? "ACTIVE" : "COMPLETED",
      completedAt: input.maxPeriods > 1 ? null : new Date(),
    },
    select: { id: true, percent: true },
  });

  await creditIncome(tx, {
    beneficiaryUserId: input.beneficiaryUserId,
    sourceUserId: input.sourceUserId,
    investmentId: input.investmentId,
    commissionScheduleId: schedule.id,
    type: input.type,
    level: input.type === "MONTHLY_LEVEL" ? 2 : null,
    percent: schedule.percent,
    baseAmount: input.baseAmount,
    idempotencyKey: `commission-schedule:${schedule.id}:period:1`,
    description:
      input.type === "MONTHLY_DIRECT"
        ? "Monthly direct-team commission, period 1."
        : "Monthly level-two commission, period 1.",
  });
}

async function activeDirectInvestments(tx: TransactionClient, sponsorId: string) {
  return tx.investment.findMany({
    where: {
      status: "ACTIVE",
      user: {
        sponsorId,
        status: { notIn: ["BLOCKED", "ARCHIVED"] },
      },
    },
    orderBy: { activatedAt: "asc" },
    select: {
      id: true,
      userId: true,
      amount: true,
      durationMonths: true,
      activatedAt: true,
    },
  });
}

export async function evaluateCommissionQualifications(
  tx: TransactionClient,
  input: { activatedUserId: string; settings: InvestmentSettings },
): Promise<void> {
  const activatedUser = await tx.userProfile.findUnique({
    where: { id: input.activatedUserId },
    select: {
      sponsorId: true,
      sponsor: { select: { sponsorId: true, status: true } },
    },
  });
  if (!activatedUser?.sponsorId) return;

  const directBeneficiary = await tx.userProfile.findUnique({
    where: { id: activatedUser.sponsorId },
    select: { status: true },
  });
  if (
    directBeneficiary &&
    directBeneficiary.status !== "BLOCKED" &&
    directBeneficiary.status !== "ARCHIVED"
  ) {
    const investments = await activeDirectInvestments(tx, activatedUser.sponsorId);
    const directUsers = new Set(investments.map((investment) => investment.userId));
    if (directUsers.size >= input.settings.directQualificationCount) {
      for (const investment of investments) {
        const maxPeriods = remainingCommissionPeriods(
          investment.activatedAt,
          investment.durationMonths,
          new Date(),
        );
        if (maxPeriods === 0) continue;
        await createScheduleWithInitialCredit(tx, {
          beneficiaryUserId: activatedUser.sponsorId,
          sourceUserId: investment.userId,
          investmentId: investment.id,
          type: "MONTHLY_DIRECT",
          percent: input.settings.directMonthlyPercent,
          baseAmount: investment.amount,
          maxPeriods,
        });
      }
    }
  }

  const branchSponsor = activatedUser.sponsor;
  const levelBeneficiaryId = branchSponsor?.sponsorId;
  if (!branchSponsor || !levelBeneficiaryId || branchSponsor.status === "BLOCKED" || branchSponsor.status === "ARCHIVED") return;
  const levelBeneficiary = await tx.userProfile.findUnique({
    where: { id: levelBeneficiaryId },
    select: { status: true },
  });
  if (!levelBeneficiary || levelBeneficiary.status === "BLOCKED" || levelBeneficiary.status === "ARCHIVED") return;

  const branchInvestments = await activeDirectInvestments(tx, activatedUser.sponsorId);
  const branchUsers = new Set(branchInvestments.map((investment) => investment.userId));
  if (branchUsers.size < input.settings.branchQualificationCount) return;

  for (const investment of branchInvestments) {
    const maxPeriods = remainingCommissionPeriods(
      investment.activatedAt,
      investment.durationMonths,
      new Date(),
    );
    if (maxPeriods === 0) continue;
    await createScheduleWithInitialCredit(tx, {
      beneficiaryUserId: levelBeneficiaryId,
      sourceUserId: investment.userId,
      investmentId: investment.id,
      type: "MONTHLY_LEVEL",
      percent: input.settings.levelMonthlyPercent,
      baseAmount: investment.amount,
      maxPeriods,
    });
  }
}

export { addUtcMonths, creditIncome, remainingCommissionPeriods };
