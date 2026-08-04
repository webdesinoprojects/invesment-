import "server-only";

import type { UserStatus } from "@/generated/prisma/client";

import { runSerializable } from "../../shared/transaction";
import type { DeleteMemberInput } from "../schemas/delete-member";

type MemberAccessSnapshot = {
  status: UserStatus;
  blockedAt: Date | null;
  blockedByAdminId: string | null;
  blockReason: string | null;
};

type ProtectedRecordCounts = {
  directReferrals: number;
  ancestorLinks: number;
  investments: number;
  fundedInvestments: number;
  depositRequests: number;
  withdrawalRequests: number;
  walletEntries: number;
  incomeEntries: number;
  sourcedIncomeEntries: number;
};

const deletionSelect = {
  id: true,
  authUserId: true,
  memberId: true,
  fullName: true,
  email: true,
  mobile: true,
  status: true,
  blockedAt: true,
  blockedByAdminId: true,
  blockReason: true,
  _count: {
    select: {
      directReferrals: true,
      ancestorLinks: true,
      investments: true,
      fundedInvestments: true,
      depositRequests: true,
      withdrawalRequests: true,
      walletEntries: true,
      incomeEntries: true,
      sourcedIncomeEntries: true,
    },
  },
} as const;

function describeProtectedRecords(counts: ProtectedRecordCounts): string[] {
  const blockers: string[] = [];
  if (counts.directReferrals > 0) blockers.push(`${counts.directReferrals} direct referral(s)`);
  if (counts.directReferrals === 0 && counts.ancestorLinks > 1) {
    blockers.push(`${counts.ancestorLinks - 1} downline relationship(s)`);
  }
  if (counts.investments > 0) blockers.push(`${counts.investments} investment(s)`);
  if (counts.fundedInvestments > 0) {
    blockers.push(`${counts.fundedInvestments} funded investment(s)`);
  }
  if (counts.depositRequests > 0) blockers.push(`${counts.depositRequests} deposit request(s)`);
  if (counts.withdrawalRequests > 0) {
    blockers.push(`${counts.withdrawalRequests} withdrawal request(s)`);
  }
  if (counts.walletEntries > 0) blockers.push(`${counts.walletEntries} wallet entry/entries`);
  if (counts.incomeEntries > 0) blockers.push(`${counts.incomeEntries} income entry/entries`);
  if (counts.sourcedIncomeEntries > 0) {
    blockers.push(`${counts.sourcedIncomeEntries} sourced income entry/entries`);
  }
  return blockers;
}

export async function prepareMemberDeletion(
  input: DeleteMemberInput & { adminId: string },
) {
  return runSerializable(async (tx) => {
    const member = await tx.userProfile.findUnique({
      where: { id: input.id },
      select: deletionSelect,
    });
    if (!member) return { ok: false as const, code: "NOT_FOUND" };
    if (member.memberId !== input.memberId) {
      return { ok: false as const, code: "MEMBER_MISMATCH" };
    }

    const blockers = describeProtectedRecords(member._count);
    if (blockers.length > 0) {
      return { ok: false as const, code: "PROTECTED", blockers };
    }

    const previousAccess: MemberAccessSnapshot = {
      status: member.status,
      blockedAt: member.blockedAt,
      blockedByAdminId: member.blockedByAdminId,
      blockReason: member.blockReason,
    };
    await tx.userProfile.update({
      where: { id: member.id },
      data: {
        status: "BLOCKED",
        blockedAt: new Date(),
        blockedByAdminId: input.adminId,
        blockReason: input.reason,
      },
    });
    await tx.auditLog.create({
      data: {
        actorAdminId: input.adminId,
        targetUserId: member.id,
        action: "MEMBER_DELETE_PREPARE",
        entityType: "UserProfile",
        entityId: member.id,
        before: previousAccess,
        after: { status: "BLOCKED", deletionPending: true },
        reason: input.reason,
      },
    });

    return {
      ok: true as const,
      member: {
        id: member.id,
        authUserId: member.authUserId,
        memberId: member.memberId,
        fullName: member.fullName,
        email: member.email,
        mobile: member.mobile,
      },
      previousAccess,
    };
  });
}

export async function cancelPreparedMemberDeletion(input: {
  id: string;
  authUserId: string;
  adminId: string;
  reason: string;
  previousAccess: MemberAccessSnapshot;
}) {
  return runSerializable(async (tx) => {
    const restored = await tx.userProfile.updateMany({
      where: { id: input.id, authUserId: input.authUserId },
      data: input.previousAccess,
    });
    if (restored.count === 0) return;
    await tx.auditLog.create({
      data: {
        actorAdminId: input.adminId,
        targetUserId: input.id,
        action: "MEMBER_DELETE_AUTH_FAILED",
        entityType: "UserProfile",
        entityId: input.id,
        outcome: "FAILED",
        errorCode: "SUPABASE_AUTH_DELETE_FAILED",
        reason: input.reason,
        after: { accessRestored: true },
      },
    });
  });
}

export async function finalizeMemberDeletion(input: {
  id: string;
  authUserId: string;
  memberId: string;
  adminId: string;
  reason: string;
}) {
  return runSerializable(async (tx) => {
    const member = await tx.userProfile.findUnique({
      where: { id: input.id },
      select: deletionSelect,
    });
    if (!member) return { ok: false as const, code: "NOT_FOUND" };
    if (
      member.memberId !== input.memberId ||
      member.authUserId !== input.authUserId
    ) {
      return { ok: false as const, code: "MEMBER_MISMATCH" };
    }

    const blockers = describeProtectedRecords(member._count);
    if (blockers.length > 0) {
      return { ok: false as const, code: "PROTECTED", blockers };
    }

    const deletedNotes = await tx.adminUserNote.deleteMany({
      where: { userId: member.id },
    });
    await tx.auditLog.create({
      data: {
        actorAdminId: input.adminId,
        targetUserId: member.id,
        action: "MEMBER_DELETE",
        entityType: "UserProfile",
        entityId: member.id,
        before: {
          memberId: member.memberId,
          fullName: member.fullName,
          email: member.email,
          mobile: member.mobile,
          status: member.status,
        },
        after: { deleted: true },
        reason: input.reason,
        metadata: {
          authUserId: member.authUserId,
          deletedAdministratorNotes: deletedNotes.count,
        },
      },
    });
    await tx.userProfile.delete({ where: { id: member.id } });
    return { ok: true as const };
  });
}
