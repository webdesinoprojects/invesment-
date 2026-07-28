import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { TransitionWithdrawalInput } from "../schemas/transition-withdrawal";
import { hasPrismaCode, runSerializable } from "../../shared/transaction";

export type WithdrawalTransitionResult =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "INVALID_TRANSITION" | "CONFLICT" | "DUPLICATE_HASH" };

export async function transitionWithdrawal(input: TransitionWithdrawalInput & { adminId: string }): Promise<WithdrawalTransitionResult> {
  try {
    return await runSerializable(async (tx) => {
      const request = await tx.withdrawalRequest.findUnique({ where: { id: input.id } });
      if (!request) return { ok: false, code: "NOT_FOUND" };
      const now = new Date();

      if (input.transition === "PROCESS") {
        if (request.status !== "PENDING") return { ok: false, code: "INVALID_TRANSITION" };
        const updated = await tx.withdrawalRequest.updateMany({
          where: { id: request.id, status: "PENDING", version: request.version },
          data: {
            status: "PROCESSING", reviewedById: input.adminId, processedById: input.adminId,
            reviewSource: "ADMIN", reviewedAt: now, processingStartedAt: now,
            reviewNote: input.reason, version: { increment: 1 },
          },
        });
        if (updated.count !== 1) throw new Error("ADMIN_CONFLICT");
      } else if (input.transition === "PAY") {
        if (request.status !== "PROCESSING" || request.settlementLedgerEntryId || request.releaseLedgerEntryId) {
          return { ok: false, code: "INVALID_TRANSITION" };
        }
        const netAmount = request.amount.minus(request.feeAmount);
        const latest = await tx.walletLedgerEntry.findFirst({
          where: { userId: request.userId }, orderBy: { sequence: "desc" }, select: { balanceAfter: true },
        });
        const settlement = await tx.walletLedgerEntry.create({
          data: {
            userId: request.userId, direction: "SETTLE", category: "WITHDRAWAL",
            amount: netAmount, balanceAfter: latest?.balanceAfter ?? new Prisma.Decimal(0),
            referenceType: "WithdrawalRequest", referenceId: request.id,
            idempotencyKey: `withdrawal:${request.id}:settlement`,
            description: "External withdrawal payment recorded; original hold settled.",
            createdByAdminId: input.adminId,
            metadata: { paymentHash: input.paymentHash },
          },
        });
        const updated = await tx.withdrawalRequest.updateMany({
          where: { id: request.id, status: "PROCESSING", version: request.version, settlementLedgerEntryId: null, releaseLedgerEntryId: null },
          data: {
            status: "PAID", netAmount, paymentHash: input.paymentHash, paidById: input.adminId,
            paidAt: now, reviewNote: input.reason || request.reviewNote,
            settlementLedgerEntryId: settlement.id, version: { increment: 1 },
          },
        });
        if (updated.count !== 1) throw new Error("ADMIN_CONFLICT");
      } else {
        const allowed = input.transition === "REJECT"
          ? request.status === "PENDING" || request.status === "PROCESSING"
          : request.status === "PROCESSING";
        if (!allowed || request.releaseLedgerEntryId || request.settlementLedgerEntryId) {
          return { ok: false, code: "INVALID_TRANSITION" };
        }
        const latest = await tx.walletLedgerEntry.findFirst({
          where: { userId: request.userId }, orderBy: { sequence: "desc" }, select: { balanceAfter: true },
        });
        const currentBalance = latest?.balanceAfter ?? new Prisma.Decimal(0);
        const release = await tx.walletLedgerEntry.create({
          data: {
            userId: request.userId, direction: "RELEASE", category: "WITHDRAWAL",
            amount: request.amount, balanceAfter: currentBalance.plus(request.amount),
            referenceType: "WithdrawalRequest", referenceId: request.id,
            idempotencyKey: `withdrawal:${request.id}:release`,
            description: input.transition === "REJECT" ? "Withdrawal hold released after rejection." : "Withdrawal hold released after payment failure.",
            createdByAdminId: input.adminId,
          },
        });
        const targetStatus = input.transition === "REJECT" ? "REJECTED" : "FAILED";
        const updated = await tx.withdrawalRequest.updateMany({
          where: { id: request.id, status: request.status, version: request.version, releaseLedgerEntryId: null, settlementLedgerEntryId: null },
          data: {
            status: targetStatus, reviewedById: request.reviewedById ?? input.adminId,
            reviewSource: request.reviewSource ?? "ADMIN", reviewedAt: request.reviewedAt ?? now,
            rejectionReason: input.transition === "REJECT" ? input.reason : null,
            failureReason: input.transition === "FAIL" ? input.reason : null,
            failedAt: input.transition === "FAIL" ? now : null,
            releaseLedgerEntryId: release.id, version: { increment: 1 },
          },
        });
        if (updated.count !== 1) throw new Error("ADMIN_CONFLICT");
      }

      await tx.auditLog.create({
        data: {
          actorAdminId: input.adminId, targetUserId: request.userId,
          action: `WITHDRAWAL_${input.transition}`, entityType: "WithdrawalRequest", entityId: request.id,
          before: { status: request.status, version: request.version },
          after: { transition: input.transition, version: request.version + 1 },
          reason: input.reason || null,
        },
      });
      return { ok: true };
    });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) return { ok: false, code: "DUPLICATE_HASH" };
    if (error instanceof Error && error.message === "ADMIN_CONFLICT") return { ok: false, code: "CONFLICT" };
    throw error;
  }
}
