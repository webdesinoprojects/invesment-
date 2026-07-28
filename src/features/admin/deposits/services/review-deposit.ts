import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { ReviewDepositInput } from "../schemas/review-deposit";
import { runSerializable, hasPrismaCode } from "../../shared/transaction";

export type DepositReviewResult =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "CONFLICT" | "DUPLICATE" };

export async function reviewDeposit(input: ReviewDepositInput & { adminId: string }): Promise<DepositReviewResult> {
  try {
    return await runSerializable(async (tx) => {
      const request = await tx.depositRequest.findUnique({ where: { id: input.id } });
      if (!request) return { ok: false, code: "NOT_FOUND" };
      if (request.status !== "PENDING") return { ok: false, code: "CONFLICT" };

      if (input.decision === "REJECT") {
        const updated = await tx.depositRequest.updateMany({
          where: { id: request.id, status: "PENDING", version: request.version },
          data: {
            status: "REJECTED", reviewedById: input.adminId, reviewSource: "ADMIN",
            reviewedAt: new Date(), rejectionReason: input.reason, version: { increment: 1 },
          },
        });
        if (updated.count !== 1) throw new Error("ADMIN_CONFLICT");
      } else {
        const latest = await tx.walletLedgerEntry.findFirst({
          where: { userId: request.userId }, orderBy: { sequence: "desc" },
          select: { balanceAfter: true },
        });
        const currentBalance = latest?.balanceAfter ?? new Prisma.Decimal(0);
        const ledger = await tx.walletLedgerEntry.create({
          data: {
            userId: request.userId, direction: "CREDIT", category: "DEPOSIT",
            amount: request.amount, balanceAfter: currentBalance.plus(request.amount),
            referenceType: "DepositRequest", referenceId: request.id,
            idempotencyKey: `deposit:${request.id}:approval`,
            description: "Verified deposit approved by administrator.",
            createdByAdminId: input.adminId,
          },
        });
        const updated = await tx.depositRequest.updateMany({
          where: { id: request.id, status: "PENDING", version: request.version },
          data: {
            status: "APPROVED", approvedAmount: request.amount, reviewedById: input.adminId,
            reviewSource: "ADMIN", reviewedAt: new Date(), reviewNote: input.reason || null,
            creditLedgerEntryId: ledger.id, version: { increment: 1 },
          },
        });
        if (updated.count !== 1) throw new Error("ADMIN_CONFLICT");
      }
      await tx.auditLog.create({
        data: {
          actorAdminId: input.adminId, targetUserId: request.userId,
          action: `DEPOSIT_${input.decision}`, entityType: "DepositRequest", entityId: request.id,
          before: { status: request.status, version: request.version },
          after: { status: input.decision === "APPROVE" ? "APPROVED" : "REJECTED", version: request.version + 1 },
          reason: input.reason || null,
        },
      });
      return { ok: true };
    });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) return { ok: false, code: "DUPLICATE" };
    if (error instanceof Error && error.message === "ADMIN_CONFLICT") return { ok: false, code: "CONFLICT" };
    throw error;
  }
}
