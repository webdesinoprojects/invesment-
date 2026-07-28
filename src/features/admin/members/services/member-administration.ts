import "server-only";

import { hashSecurityPin } from "@/lib/security/pin";

import { runSerializable } from "../../shared/transaction";
import type {
  CreateMemberNoteInput,
  ReplaceMemberPinInput,
  UpdateMemberProfileInput,
} from "../schemas/member-administration";

export async function updateMemberProfile(
  input: UpdateMemberProfileInput & { adminId: string },
) {
  return runSerializable(async (tx) => {
    const member = await tx.userProfile.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        fullName: true,
        mobile: true,
        countryCode: true,
        bep20WalletAddress: true,
      },
    });
    if (!member) return { ok: false as const, code: "NOT_FOUND" };

    const next = {
      fullName: input.fullName,
      mobile: input.mobile,
      countryCode: input.countryCode,
      bep20WalletAddress: input.bep20WalletAddress,
    };
    await tx.userProfile.update({ where: { id: member.id }, data: next });
    await tx.auditLog.create({
      data: {
        actorAdminId: input.adminId,
        targetUserId: member.id,
        action: "MEMBER_PROFILE_UPDATE",
        entityType: "UserProfile",
        entityId: member.id,
        before: member,
        after: next,
        reason: input.reason,
      },
    });
    return { ok: true as const };
  });
}

export async function createMemberNote(
  input: CreateMemberNoteInput & { adminId: string },
) {
  return runSerializable(async (tx) => {
    const member = await tx.userProfile.findUnique({
      where: { id: input.id },
      select: { id: true },
    });
    if (!member) return { ok: false as const, code: "NOT_FOUND" };
    const note = await tx.adminUserNote.create({
      data: { userId: member.id, authorAdminId: input.adminId, note: input.note },
      select: { id: true },
    });
    await tx.auditLog.create({
      data: {
        actorAdminId: input.adminId,
        targetUserId: member.id,
        action: "MEMBER_NOTE_CREATE",
        entityType: "AdminUserNote",
        entityId: note.id,
        after: { noteLength: input.note.length },
      },
    });
    return { ok: true as const };
  });
}

export async function replaceMemberPin(
  input: ReplaceMemberPinInput & { adminId: string },
) {
  const securityPinHash = await hashSecurityPin(input.newPin);
  return runSerializable(async (tx) => {
    const member = await tx.userProfile.findUnique({
      where: { id: input.id },
      select: { id: true },
    });
    if (!member) return { ok: false as const, code: "NOT_FOUND" };
    await tx.userProfile.update({
      where: { id: member.id },
      data: {
        securityPinHash,
        securityPinFailedAttempts: 0,
        securityPinLockedUntil: null,
      },
    });
    await tx.auditLog.create({
      data: {
        actorAdminId: input.adminId,
        targetUserId: member.id,
        action: "MEMBER_MPIN_REPLACED",
        entityType: "UserProfile",
        entityId: member.id,
        reason: input.reason,
        metadata: { existingPinExposed: false },
      },
    });
    return { ok: true as const };
  });
}
