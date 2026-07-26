import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import type { RoiCreditResult } from "@/features/roi/types/roi";
import { addMonthsToIndiaDateKey, getIndiaDateKey } from "@/lib/date/business-day";
import { getPrisma } from "@/lib/db/prisma";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

const DAYS_PER_ROI_MONTH = 30;
const MAX_TRANSACTION_ATTEMPTS = 3;

function hasPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export async function creditDailyRoi({
  runId,
  investmentId,
  creditDate,
  dateKey,
}: {
  runId: string;
  investmentId: string;
  creditDate: Date;
  dateKey: string;
}): Promise<RoiCreditResult> {
  const db = getPrisma();

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(
        async (transaction) => creditInTransaction(transaction, {
          runId,
          investmentId,
          creditDate,
          dateKey,
        }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (hasPrismaCode(error, "P2002")) return { status: "ALREADY_CREDITED" };
      if (hasPrismaCode(error, "P2034") && attempt < MAX_TRANSACTION_ATTEMPTS) continue;
      throw error;
    }
  }

  throw new Error("ROI credit transaction retry limit reached.");
}

async function creditInTransaction(
  transaction: TransactionClient,
  input: {
    runId: string;
    investmentId: string;
    creditDate: Date;
    dateKey: string;
  },
): Promise<RoiCreditResult> {
  const investment = await transaction.investment.findUnique({
    where: { id: input.investmentId },
    select: {
      id: true,
      userId: true,
      amount: true,
      monthlyRoiPercent: true,
      durationMonths: true,
      payoutCapAmount: true,
      paidOutAmount: true,
      status: true,
      activatedAt: true,
    },
  });
  if (!investment || investment.status !== "ACTIVE") return { status: "COMPLETED" };

  const existing = await transaction.roiCredit.findUnique({
    where: {
      investmentId_creditDate: {
        investmentId: investment.id,
        creditDate: input.creditDate,
      },
    },
    select: { id: true },
  });
  if (existing) return { status: "ALREADY_CREDITED" };

  const activationDateKey = getIndiaDateKey(investment.activatedAt);
  if (input.dateKey <= activationDateKey) return { status: "NOT_ELIGIBLE" };

  const expiryDateKey = addMonthsToIndiaDateKey(investment.activatedAt, investment.durationMonths);
  const remainingPayout = investment.payoutCapAmount.minus(investment.paidOutAmount);
  if (input.dateKey >= expiryDateKey || remainingPayout.lessThanOrEqualTo(0)) {
    await completeInvestment(transaction, investment.id);
    return { status: "COMPLETED" };
  }

  const calculatedDailyRoi = investment.amount
    .mul(investment.monthlyRoiPercent)
    .div(100)
    .div(DAYS_PER_ROI_MONTH)
    .toDecimalPlaces(6, Prisma.Decimal.ROUND_HALF_UP);
  const creditAmount = Prisma.Decimal.min(calculatedDailyRoi, remainingPayout);
  if (creditAmount.lessThanOrEqualTo(0)) {
    await completeInvestment(transaction, investment.id);
    return { status: "COMPLETED" };
  }

  const latestWalletEntry = await transaction.walletLedgerEntry.findFirst({
    where: { userId: investment.userId },
    orderBy: { sequence: "desc" },
    select: { balanceAfter: true },
  });
  const currentBalance = latestWalletEntry?.balanceAfter ?? new Prisma.Decimal(0);
  const idempotencyKey = `roi:${investment.id}:${input.dateKey}`;

  const income = await transaction.incomeLedgerEntry.create({
    data: {
      userId: investment.userId,
      investmentId: investment.id,
      type: "DAILY_ROI",
      percent: investment.monthlyRoiPercent,
      baseAmount: investment.amount,
      amount: creditAmount,
      idempotencyKey,
      description: `Daily ROI income for ${input.dateKey}.`,
      creditedAt: input.creditDate,
    },
    select: { id: true },
  });

  await transaction.walletLedgerEntry.create({
    data: {
      userId: investment.userId,
      direction: "CREDIT",
      category: "ROI",
      amount: creditAmount,
      balanceAfter: currentBalance.plus(creditAmount),
      referenceType: "IncomeLedgerEntry",
      referenceId: income.id,
      idempotencyKey: `income-credit:${income.id}`,
      description: `Daily ROI credited for ${input.dateKey}.`,
      createdAt: input.creditDate,
    },
  });

  await transaction.roiCredit.create({
    data: {
      runId: input.runId,
      investmentId: investment.id,
      incomeLedgerEntryId: income.id,
      amount: creditAmount,
      creditDate: input.creditDate,
    },
  });

  const paidOutAmount = investment.paidOutAmount.plus(creditAmount);
  const completed = paidOutAmount.greaterThanOrEqualTo(investment.payoutCapAmount);
  await transaction.investment.update({
    where: { id: investment.id },
    data: {
      paidOutAmount,
      status: completed ? "COMPLETED" : "ACTIVE",
      completedAt: completed ? input.creditDate : null,
    },
  });

  return { status: "CREDITED", amount: creditAmount.toFixed(6) };
}

async function completeInvestment(
  transaction: TransactionClient,
  investmentId: string,
): Promise<void> {
  await transaction.investment.updateMany({
    where: { id: investmentId, status: "ACTIVE" },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}
