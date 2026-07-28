"use server";

import { revalidatePath } from "next/cache";

import { getServerEnv } from "@/lib/env/server";
import { getPrisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";

import type { AdminActionResult } from "../../shared/action-result";
import {
  createMemberNoteSchema,
  replaceMemberPinSchema,
  requestMemberPasswordResetSchema,
  updateMemberProfileSchema,
} from "../schemas/member-administration";
import {
  createMemberNote,
  replaceMemberPin,
  updateMemberProfile,
} from "../services/member-administration";

export async function updateMemberProfileAction(
  _state: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const parsed = updateMemberProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Check the approved profile fields, reason and confirmation.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const admin = await requireAdminPermission("members.manage");
  try {
    const result = await updateMemberProfile({ ...parsed.data, adminId: admin.adminId });
    if (!result.ok) return { ok: false, code: result.code, message: "Member not found." };
    revalidatePath(`/admin/members/${parsed.data.id}`);
    return { ok: true, data: undefined, message: "Approved profile fields updated and audited." };
  } catch {
    return { ok: false, code: "FAILED", message: "Member profile update failed." };
  }
}

export async function createMemberNoteAction(
  _state: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const parsed = createMemberNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", message: "Enter a valid administrator note." };
  }
  const admin = await requireAdminPermission("members.manage");
  try {
    const result = await createMemberNote({ ...parsed.data, adminId: admin.adminId });
    if (!result.ok) return { ok: false, code: result.code, message: "Member not found." };
    revalidatePath(`/admin/members/${parsed.data.id}`);
    return { ok: true, data: undefined, message: "Administrator note added." };
  } catch {
    return { ok: false, code: "FAILED", message: "Administrator note could not be added." };
  }
}

export async function requestMemberPasswordResetAction(
  _state: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const parsed = requestMemberPasswordResetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "A reason and explicit confirmation are required.",
    };
  }
  const admin = await requireAdminPermission("members.sensitive");
  const member = await getPrisma().userProfile.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, email: true },
  });
  if (!member) return { ok: false, code: "NOT_FOUND", message: "Member not found." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(member.email, {
    redirectTo: `${getServerEnv().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/reset-password`,
  });
  await getPrisma().auditLog.create({
    data: {
      actorAdminId: admin.adminId,
      targetUserId: member.id,
      action: "MEMBER_PASSWORD_RECOVERY_REQUEST",
      entityType: "UserProfile",
      entityId: member.id,
      outcome: error ? "FAILED" : "SUCCESS",
      errorCode: error ? "SUPABASE_RECOVERY_FAILED" : null,
      reason: parsed.data.reason,
    },
  });
  return error
    ? { ok: false, code: "RECOVERY_FAILED", message: "Password recovery could not be sent." }
    : { ok: true, data: undefined, message: "Password recovery email requested securely." };
}

export async function replaceMemberPinAction(
  _state: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const parsed = replaceMemberPinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Enter matching 4–6 digit replacement PINs, a reason and confirmation.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const admin = await requireAdminPermission("members.sensitive");
  try {
    const result = await replaceMemberPin({ ...parsed.data, adminId: admin.adminId });
    if (!result.ok) return { ok: false, code: result.code, message: "Member not found." };
    return {
      ok: true,
      data: undefined,
      message: "Member MPIN replaced securely. The previous MPIN was never read or displayed.",
    };
  } catch {
    return { ok: false, code: "FAILED", message: "Member MPIN replacement failed." };
  }
}
