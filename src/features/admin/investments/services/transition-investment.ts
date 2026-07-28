import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import type { TransitionInvestmentInput } from "../schemas/transition-investment";

const allowed: Record<string, readonly string[]> = {
  ACTIVE: ["PAUSED", "CANCELLED"],
  PAUSED: ["ACTIVE", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function transitionInvestment(input: TransitionInvestmentInput & { adminId: string }) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const investment = await tx.investment.findUnique({ where: { id: input.id }, select: { id: true, userId: true, status: true } });
    if (!investment) return { ok: false as const, code: "NOT_FOUND" };
    if (!allowed[investment.status]?.includes(input.status)) return { ok: false as const, code: "INVALID_TRANSITION" };
    await tx.investment.update({
      where: { id: investment.id },
      data: {
        status: input.status, statusChangedById: input.adminId,
        statusReason: input.status === "ACTIVE" ? null : input.reason,
        pausedAt: input.status === "PAUSED" ? new Date() : null,
        cancelledAt: input.status === "CANCELLED" ? new Date() : null,
      },
    });
    await tx.auditLog.create({
      data: { actorAdminId: input.adminId, targetUserId: investment.userId, action: "INVESTMENT_STATUS_UPDATE", entityType: "Investment", entityId: investment.id, before: { status: investment.status }, after: { status: input.status }, reason: input.reason || null },
    });
    return { ok: true as const };
  });
}
