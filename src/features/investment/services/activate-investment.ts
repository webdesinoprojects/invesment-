import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import type { InvestmentSettings } from "@/features/investment/queries/get-investment-settings";
import type { ActivateInvestmentResult } from "@/features/investment/types/investment";
import { getPrisma } from "@/lib/db/prisma";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

const MAX_TRANSACTION_ATTEMPTS = 3;

function hasPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export async function activateInvestment({
  payerUserId,
  targetMemberId,
  amount,
  requestToken,
  settings,
}: {
  payerUserId: string;
  targetMemberId: string;
  amount: string;
  requestToken: string;
  settings: InvestmentSettings;
}): Promise<ActivateInvestmentResult> {
  const db = getPrisma();
  const idempotencyKey = `investment-activation:${requestToken}`;

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) =>
          activateInTransaction(tx, {
            payerUserId,
            targetMemberId,
            amount,
            idempotencyKey,
            settings,
          }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (hasPrismaCode(error, "P2002")) return { ok: false, code: "DUPLICATE_REQUEST" };
      if (hasPrismaCode(error, "P2034") && attempt < MAX_TRANSACTION_ATTEMPTS) continue;
      throw error;
    }
  }

  throw new Error("Investment transaction retry limit reached.");
}

async function activateInTransaction(
  tx: TransactionClient,
  input: {
    payerUserId: string;
    targetMemberId: string;
    amount: string;
    idempotencyKey: string;
    settings: InvestmentSettings;
  },
): Promise<ActivateInvestmentResult> {
  const duplicate = await tx.walletLedgerEntry.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { id: true },
  });
  if (duplicate) return { ok: false, code: "DUPLICATE_REQUEST" };

  const [target, payerLedger] = await Promise.all([
    tx.userProfile.findUnique({
      where: { memberId: input.targetMemberId },
      select: { id: true, status: true },
    }),
    tx.walletLedgerEntry.findFirst({
      where: { userId: input.payerUserId },
      orderBy: { sequence: "desc" },
      select: { balanceAfter: true },
    }),
  ]);
  if (!target) return { ok: false, code: "MEMBER_NOT_FOUND" };
  if (target.status === "BLOCKED") return { ok: false, code: "MEMBER_BLOCKED" };

  const investmentAmount = new Prisma.Decimal(input.amount);
  const payerBalance = payerLedger?.balanceAfter ?? new Prisma.Decimal(0);
  if (investmentAmount.greaterThan(payerBalance)) {
    return { ok: false, code: "INSUFFICIENT_FUNDS" };
  }

  const investment = await tx.investment.create({
    data: {
      userId: target.id,
      fundedByUserId: input.payerUserId,
      amount: investmentAmount,
      payoutCapAmount: investmentAmount.mul(2).toDecimalPlaces(6),
      monthlyRoiPercent: input.settings.monthlyRoiPercent,
      durationMonths: input.settings.durationMonths,
      source: "WALLET",
    },
    select: { id: true },
  });

  await tx.walletLedgerEntry.create({
    data: {
      userId: input.payerUserId,
      direction: "DEBIT",
      category: "INVESTMENT",
      amount: investmentAmount,
      balanceAfter: payerBalance.minus(investmentAmount),
      referenceType: "Investment",
      referenceId: investment.id,
      idempotencyKey: input.idempotencyKey,
      description: `Wallet-funded activation for ${input.targetMemberId}.`,
    },
  });

  await Promise.all([
    tx.userProfile.update({
      where: { id: target.id },
      data: { status: "ACTIVE", isReferralActive: true },
    }),
    tx.referralLink.updateMany({
      where: { userId: target.id },
      data: { isActive: true },
    }),
  ]);

  await creditReferralCommissions(tx, {
    investmentId: investment.id,
    sourceUserId: target.id,
    baseAmount: investmentAmount,
    settings: input.settings,
  });

  return { ok: true, investmentId: investment.id };
}

async function creditReferralCommissions(
  tx: TransactionClient,
  input: {
    investmentId: string;
    sourceUserId: string;
    baseAmount: Prisma.Decimal;
    settings: InvestmentSettings;
  },
): Promise<void> {
  const ancestors = await tx.referralClosure.findMany({
    where: {
      descendantId: input.sourceUserId,
      depth: { gte: 1, lte: input.settings.maxLevelDepth },
      ancestor: { status: "ACTIVE", isReferralActive: true },
    },
    orderBy: { depth: "asc" },
    select: { ancestorId: true, depth: true },
  });

  const balances = new Map<string, Prisma.Decimal>();
  for (const ancestor of ancestors) {
    const latest = await tx.walletLedgerEntry.findFirst({
      where: { userId: ancestor.ancestorId },
      orderBy: { sequence: "desc" },
      select: { balanceAfter: true },
    });
    balances.set(ancestor.ancestorId, latest?.balanceAfter ?? new Prisma.Decimal(0));
  }

  for (const ancestor of ancestors) {
    const isDirect = ancestor.depth === 1;
    const percent = new Prisma.Decimal(
      isDirect
        ? input.settings.directCommissionPercent
        : input.settings.levelCommissionPercent,
    );
    const commission = input.baseAmount
      .mul(percent)
      .div(100)
      .toDecimalPlaces(6, Prisma.Decimal.ROUND_HALF_UP);
    if (commission.isZero()) continue;

    const income = await tx.incomeLedgerEntry.create({
      data: {
        userId: ancestor.ancestorId,
        sourceUserId: input.sourceUserId,
        investmentId: input.investmentId,
        type: isDirect ? "DIRECT_REFERRAL" : "LEVEL_INCOME",
        level: isDirect ? null : ancestor.depth,
        percent,
        baseAmount: input.baseAmount,
        amount: commission,
        idempotencyKey: `investment:${input.investmentId}:${isDirect ? "direct" : `level-${ancestor.depth}`}:${ancestor.ancestorId}`,
        description: isDirect ? "Direct referral commission." : `Level ${ancestor.depth} commission.`,
      },
      select: { id: true },
    });

    const currentBalance = balances.get(ancestor.ancestorId) ?? new Prisma.Decimal(0);
    const nextBalance = currentBalance.plus(commission);
    await tx.walletLedgerEntry.create({
      data: {
        userId: ancestor.ancestorId,
        direction: "CREDIT",
        category: isDirect ? "REFERRAL" : "LEVEL",
        amount: commission,
        balanceAfter: nextBalance,
        referenceType: "IncomeLedgerEntry",
        referenceId: income.id,
        idempotencyKey: `income-credit:${income.id}`,
        description: isDirect ? "Direct referral income credited." : `Level ${ancestor.depth} income credited.`,
      },
    });
    balances.set(ancestor.ancestorId, nextBalance);
  }
}
