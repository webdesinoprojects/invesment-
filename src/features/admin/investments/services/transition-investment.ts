import "server-only";
import type { TransitionInvestmentInput } from "../schemas/transition-investment";
import { runSerializable } from "../../shared/transaction";

const allowed: Record<string, readonly string[]> = {
  ACTIVE: ["PAUSED", "CANCELLED"],
  PAUSED: ["ACTIVE", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function transitionInvestment(input: TransitionInvestmentInput & { adminId: string }) {
  return runSerializable(async (tx) => {
    const investment = await tx.investment.findUnique({ where: { id: input.id }, select: { id: true, userId: true, status: true } });
    if (!investment) return { ok: false as const, code: "NOT_FOUND" };
    if (investment.status !== input.expectedStatus) return { ok: false as const, code: "CONFLICT" };
    if (!allowed[input.expectedStatus]?.includes(input.status)) return { ok: false as const, code: "INVALID_TRANSITION" };
    const updated = await tx.investment.updateMany({
      where: { id: investment.id, status: input.expectedStatus },
      data: {
        status: input.status, statusChangedById: input.adminId,
        statusReason: input.status === "ACTIVE" ? null : input.reason,
        pausedAt: input.status === "PAUSED" ? new Date() : null,
        cancelledAt: input.status === "CANCELLED" ? new Date() : null,
      },
    });
    if (updated.count !== 1) return { ok: false as const, code: "CONFLICT" };
    await tx.auditLog.create({
      data: { actorAdminId: input.adminId, targetUserId: investment.userId, action: "INVESTMENT_STATUS_UPDATE", entityType: "Investment", entityId: investment.id, before: { status: input.expectedStatus }, after: { status: input.status }, reason: input.reason || null },
    });
    return { ok: true as const };
  });
}
