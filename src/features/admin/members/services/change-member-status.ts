import "server-only";

import { getPrisma } from "@/lib/db/prisma";
import type { ChangeMemberStatusInput } from "../schemas/change-member-status";

export async function changeMemberStatus(input: ChangeMemberStatusInput & { adminId: string }) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const member = await tx.userProfile.findUnique({ where: { id: input.id }, select: { id: true, status: true } });
    if (!member) return { ok: false as const, code: "NOT_FOUND" };
    if (member.status === input.status) return { ok: false as const, code: "NO_CHANGE" };
    await tx.userProfile.update({
      where: { id: member.id },
      data: input.status === "BLOCKED"
        ? { status: "BLOCKED", blockedAt: new Date(), blockedByAdminId: input.adminId, blockReason: input.reason }
        : { status: "ACTIVE", blockedAt: null, blockedByAdminId: null, blockReason: null },
    });
    await tx.auditLog.create({
      data: {
        actorAdminId: input.adminId, targetUserId: member.id,
        action: input.status === "BLOCKED" ? "MEMBER_BLOCK" : "MEMBER_ACTIVATE_OR_UNBLOCK",
        entityType: "UserProfile", entityId: member.id,
        before: { status: member.status }, after: { status: input.status }, reason: input.reason || null,
      },
    });
    return { ok: true as const };
  });
}
