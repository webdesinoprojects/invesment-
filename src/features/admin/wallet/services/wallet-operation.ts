import "server-only";

import { Prisma } from "@/generated/prisma/client";

import { hasPrismaCode, runSerializable } from "../../shared/transaction";
import type {
  WalletAdjustmentInput,
  WalletReversalInput,
} from "../schemas/wallet-operation";

type WalletOperationResult =
  | { ok: true; entryId: string; balanceAfter: string }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "INSUFFICIENT_FUNDS"
        | "DUPLICATE_REQUEST"
        | "NOT_REVERSIBLE"
        | "ALREADY_REVERSED";
    };

export async function adjustWallet(
  input: WalletAdjustmentInput & { adminId: string },
): Promise<WalletOperationResult> {
  try {
    return await runSerializable(async (tx) => {
      const duplicate = await tx.walletLedgerEntry.findUnique({
        where: { idempotencyKey: `admin-adjustment:${input.idempotencyKey}` },
        select: { id: true },
      });
      if (duplicate) return { ok: false as const, code: "DUPLICATE_REQUEST" as const };

      const member = await tx.userProfile.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });
      if (!member) return { ok: false as const, code: "NOT_FOUND" as const };
      const latest = await tx.walletLedgerEntry.findFirst({
        where: { userId: member.id },
        orderBy: { sequence: "desc" },
        select: { balanceAfter: true },
      });
      const currentBalance = latest?.balanceAfter ?? new Prisma.Decimal(0);
      const amount = new Prisma.Decimal(input.amount);
      if (input.operation === "DEBIT" && amount.greaterThan(currentBalance)) {
        return { ok: false as const, code: "INSUFFICIENT_FUNDS" as const };
      }
      const balanceAfter =
        input.operation === "CREDIT"
          ? currentBalance.plus(amount)
          : currentBalance.minus(amount);
      const entry = await tx.walletLedgerEntry.create({
        data: {
          userId: member.id,
          direction: input.operation,
          category: "ADMIN_ADJUSTMENT",
          amount,
          balanceAfter,
          referenceType: "AdminAdjustment",
          idempotencyKey: `admin-adjustment:${input.idempotencyKey}`,
          description: `Administrator ${input.operation.toLowerCase()} adjustment.`,
          metadata: { reason: input.reason },
          createdByAdminId: input.adminId,
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: input.adminId,
          targetUserId: member.id,
          action: `WALLET_ADJUSTMENT_${input.operation}`,
          entityType: "WalletLedgerEntry",
          entityId: entry.id,
          before: { balance: currentBalance.toFixed(6) },
          after: {
            amount: amount.toFixed(6),
            balance: balanceAfter.toFixed(6),
          },
          reason: input.reason,
        },
      });
      return {
        ok: true as const,
        entryId: entry.id,
        balanceAfter: balanceAfter.toFixed(6),
      };
    });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) {
      return { ok: false, code: "DUPLICATE_REQUEST" };
    }
    throw error;
  }
}

export async function reverseWalletEntry(
  input: WalletReversalInput & { adminId: string },
): Promise<WalletOperationResult> {
  try {
    return await runSerializable(async (tx) => {
      const target = await tx.walletLedgerEntry.findUnique({
        where: { id: input.entryId },
        select: {
          id: true,
          userId: true,
          direction: true,
          category: true,
          amount: true,
          reversalOfEntryId: true,
          reversedByEntry: { select: { id: true } },
        },
      });
      if (!target) return { ok: false as const, code: "NOT_FOUND" as const };
      if (target.reversedByEntry) {
        return { ok: false as const, code: "ALREADY_REVERSED" as const };
      }
      if (
        target.category !== "ADMIN_ADJUSTMENT" ||
        target.reversalOfEntryId ||
        !["CREDIT", "DEBIT"].includes(target.direction)
      ) {
        return { ok: false as const, code: "NOT_REVERSIBLE" as const };
      }

      const latest = await tx.walletLedgerEntry.findFirst({
        where: { userId: target.userId },
        orderBy: { sequence: "desc" },
        select: { balanceAfter: true },
      });
      const currentBalance = latest?.balanceAfter ?? new Prisma.Decimal(0);
      const removesCredit = target.direction === "CREDIT";
      if (removesCredit && target.amount.greaterThan(currentBalance)) {
        return { ok: false as const, code: "INSUFFICIENT_FUNDS" as const };
      }
      const balanceAfter = removesCredit
        ? currentBalance.minus(target.amount)
        : currentBalance.plus(target.amount);
      const reversal = await tx.walletLedgerEntry.create({
        data: {
          userId: target.userId,
          direction: removesCredit ? "DEBIT" : "CREDIT",
          category: "ADMIN_ADJUSTMENT",
          amount: target.amount,
          balanceAfter,
          referenceType: "WalletLedgerEntry",
          referenceId: target.id,
          idempotencyKey: `admin-reversal:${input.idempotencyKey}`,
          reversalOfEntryId: target.id,
          reversalReason: input.reason,
          description: `Reversal of administrator adjustment ${target.id}.`,
          createdByAdminId: input.adminId,
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: input.adminId,
          targetUserId: target.userId,
          action: "WALLET_ADJUSTMENT_REVERSAL",
          entityType: "WalletLedgerEntry",
          entityId: reversal.id,
          before: {
            balance: currentBalance.toFixed(6),
            reversedEntryId: target.id,
          },
          after: {
            amount: target.amount.toFixed(6),
            balance: balanceAfter.toFixed(6),
          },
          reason: input.reason,
        },
      });
      return {
        ok: true as const,
        entryId: reversal.id,
        balanceAfter: balanceAfter.toFixed(6),
      };
    });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) {
      return { ok: false, code: "DUPLICATE_REQUEST" };
    }
    throw error;
  }
}
