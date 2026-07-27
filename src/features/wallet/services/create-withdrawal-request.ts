import "server-only";

import { randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import type { CreateWithdrawalResult } from "@/features/wallet/types/withdrawal";

const MAX_TRANSACTION_ATTEMPTS = 3;

function hasPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export async function createWithdrawalRequest({
  userId,
  amount,
  requestToken,
}: {
  userId: string;
  amount: string;
  requestToken: string;
}): Promise<CreateWithdrawalResult> {
  const db = getPrisma();
  const idempotencyKey = `withdrawal-request:${requestToken}`;

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => reserveWithdrawal(tx, { userId, amount, idempotencyKey }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (hasPrismaCode(error, "P2002")) return { ok: false, code: "DUPLICATE_REQUEST" };
      if (hasPrismaCode(error, "P2034") && attempt < MAX_TRANSACTION_ATTEMPTS) continue;
      throw error;
    }
  }

  throw new Error("Withdrawal transaction retry limit reached.");
}

async function reserveWithdrawal(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">,
  input: { userId: string; amount: string; idempotencyKey: string },
): Promise<CreateWithdrawalResult> {
  const duplicate = await tx.walletLedgerEntry.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { id: true },
  });
  if (duplicate) return { ok: false, code: "DUPLICATE_REQUEST" };

  const [profile, latestLedgerEntry] = await Promise.all([
    tx.userProfile.findUnique({
      where: { id: input.userId },
      select: { bep20WalletAddress: true },
    }),
    tx.walletLedgerEntry.findFirst({
      where: { userId: input.userId },
      orderBy: { sequence: "desc" },
      select: { balanceAfter: true },
    }),
  ]);
  if (!profile?.bep20WalletAddress) return { ok: false, code: "WALLET_NOT_CONFIGURED" };

  const requestedAmount = new Prisma.Decimal(input.amount);
  const availableBalance = latestLedgerEntry?.balanceAfter ?? new Prisma.Decimal(0);
  if (requestedAmount.greaterThan(availableBalance)) {
    return { ok: false, code: "INSUFFICIENT_FUNDS" };
  }

  const requestId = randomUUID();
  const hold = await tx.walletLedgerEntry.create({
    data: {
      userId: input.userId,
      direction: "HOLD",
      category: "WITHDRAWAL",
      amount: requestedAmount,
      balanceAfter: availableBalance.minus(requestedAmount),
      referenceType: "WithdrawalRequest",
      referenceId: requestId,
      idempotencyKey: input.idempotencyKey,
      description: "Funds held for pending withdrawal request.",
    },
    select: { id: true },
  });
  await tx.withdrawalRequest.create({
    data: {
      id: requestId,
      userId: input.userId,
      amount: requestedAmount,
      netAmount: requestedAmount,
      walletAddress: profile.bep20WalletAddress,
      holdLedgerEntryId: hold.id,
    },
  });

  return { ok: true };
}
