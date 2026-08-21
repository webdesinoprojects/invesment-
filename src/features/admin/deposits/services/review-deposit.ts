import "server-only";

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

      const updated = await tx.depositRequest.updateMany({
        where: { id: request.id, status: "PENDING", version: request.version },
        data: {
          status: "REJECTED", reviewedById: input.adminId, reviewSource: "ADMIN",
          reviewedAt: new Date(), rejectionReason: input.reason, version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new Error("ADMIN_CONFLICT");
      await tx.auditLog.create({
        data: {
          actorAdminId: input.adminId, targetUserId: request.userId,
          action: "DEPOSIT_REJECT", entityType: "DepositRequest", entityId: request.id,
          before: { status: request.status, version: request.version },
          after: { status: "REJECTED", version: request.version + 1 },
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
