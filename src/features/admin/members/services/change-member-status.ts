import "server-only";

import { getPrisma } from "@/lib/db/prisma";
import type { ChangeMemberStatusInput } from "../schemas/change-member-status";

export async function changeMemberStatus(input: ChangeMemberStatusInput & { adminId: string }) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const member = await tx.userProfile.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        status: true,
        investments: {
          where: { status: { in: ["ACTIVE", "PAUSED"] } },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!member) return { ok: false as const, code: "NOT_FOUND" };
    if (member.status === input.status) return { ok: false as const, code: "NO_CHANGE" };
    if (input.status === "ARCHIVED" && member.investments.length > 0) {
      return { ok: false as const, code: "ACTIVE_INVESTMENT" };
    }
    await tx.userProfile.update({
      where: { id: member.id },
      data: input.status === "BLOCKED"
        ? { status: "BLOCKED", blockedAt: new Date(), blockedByAdminId: input.adminId, blockReason: input.reason }
        : input.status === "ARCHIVED"
          ? { status: "ARCHIVED", isReferralActive: false, blockedAt: null, blockedByAdminId: null, blockReason: input.reason }
          : { status: "ACTIVE", isReferralActive: true, blockedAt: null, blockedByAdminId: null, blockReason: null },
    });
    await tx.auditLog.create({
      data: {
        actorAdminId: input.adminId, targetUserId: member.id,
        action: input.status === "BLOCKED" ? "MEMBER_BLOCK" : input.status === "ARCHIVED" ? "MEMBER_ARCHIVE" : "MEMBER_ACTIVATE_OR_UNBLOCK",
        entityType: "UserProfile", entityId: member.id,
        before: { status: member.status }, after: { status: input.status }, reason: input.reason || null,
      },
    });
    return { ok: true as const };
  });
}
