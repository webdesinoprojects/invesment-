"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";

import type { AdminActionResult } from "../../shared/action-result";
import { deleteMemberSchema } from "../schemas/delete-member";
import {
  cancelPreparedMemberDeletion,
  finalizeMemberDeletion,
  prepareMemberDeletion,
} from "../services/delete-member";

function isMissingAuthUser(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: unknown; status?: unknown };
  return candidate.code === "user_not_found" || candidate.status === 404;
}

export async function deleteMemberAction(
  _state: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const parsed = deleteMemberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Enter the exact member ID, a deletion reason and confirmation.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const admin = await requireAdminPermission("members.sensitive");
  let prepared: Awaited<ReturnType<typeof prepareMemberDeletion>>;
  try {
    prepared = await prepareMemberDeletion({
      ...parsed.data,
      adminId: admin.adminId,
    });
  } catch {
    return {
      ok: false,
      code: "PREPARE_FAILED",
      message: "The deletion checks could not be completed. No member was deleted.",
    };
  }
  if (!prepared.ok) {
    return prepared.code === "PROTECTED"
      ? {
          ok: false,
          code: prepared.code,
          message: `This member cannot be deleted because protected records exist: ${prepared.blockers?.join(", ") ?? "protected account activity"}. Block the member instead.`,
        }
      : {
          ok: false,
          code: prepared.code,
          message: "The selected member no longer matches this deletion request.",
        };
  }

  const supabase = createSupabaseAdminClient();
  let authError: unknown;
  try {
    ({ error: authError } = await supabase.auth.admin.deleteUser(
      prepared.member.authUserId,
    ));
  } catch (error) {
    authError = error;
  }
  if (authError && !isMissingAuthUser(authError)) {
    try {
      await cancelPreparedMemberDeletion({
        id: prepared.member.id,
        authUserId: prepared.member.authUserId,
        adminId: admin.adminId,
        reason: parsed.data.reason,
        previousAccess: prepared.previousAccess,
      });
    } catch {
      return {
        ok: false,
        code: "AUTH_DELETE_FAILED",
        message:
          "Authentication was not deleted and member access could not be restored automatically. Review the blocked member before continuing.",
      };
    }
    return {
      ok: false,
      code: "AUTH_DELETE_FAILED",
      message: "The authentication account could not be deleted. Member access was restored.",
    };
  }

  let deleted: Awaited<ReturnType<typeof finalizeMemberDeletion>>;
  try {
    deleted = await finalizeMemberDeletion({
      id: prepared.member.id,
      authUserId: prepared.member.authUserId,
      memberId: prepared.member.memberId,
      adminId: admin.adminId,
      reason: parsed.data.reason,
    });
  } catch {
    return {
      ok: false,
      code: "DELETE_INCOMPLETE",
      message:
        "Authentication was removed, but profile deletion failed. The member remains blocked and requires administrator review.",
    };
  }
  if (!deleted.ok) {
    return deleted.code === "PROTECTED"
      ? {
          ok: false,
          code: "DELETE_INCOMPLETE",
          message:
            "Authentication was removed, but new protected activity prevented profile deletion. The member remains blocked and requires administrator review.",
        }
      : {
          ok: false,
          code: "DELETE_INCOMPLETE",
          message:
            "Authentication was removed, but the member profile could not be finalized. Administrator review is required.",
        };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/members");
  redirect("/admin/members");
}
