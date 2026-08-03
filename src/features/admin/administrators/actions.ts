"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";

import type { AdminActionResult } from "../shared/action-result";
import { runSerializable } from "../shared/transaction";
import { administratorLifecycleSchema } from "./schemas";
import { updateAdministratorLifecycle } from "./service";

const inviteSchema = z.object({
  email: z.email().trim().toLowerCase(),
  displayName: z.string().trim().min(2).max(120),
  role: z.enum(["SUPER_ADMIN", "OPERATOR", "VIEWER"]),
  reason: z.string().trim().min(3).max(500),
});

export async function inviteAdministratorAction(
  _state: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Check the invitation details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const actor = await requireAdminPermission("administrators.manage");
  const supabase = createSupabaseAdminClient();
  const redirectTo = new URL(
    "/admin/accept-invite",
    getServerEnv().NEXT_PUBLIC_SITE_URL,
  ).toString();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo,
  });
  if (error || !data.user) {
    return {
      ok: false,
      code: "INVITE_FAILED",
      message: "The administrator invitation could not be created.",
    };
  }

  try {
    await runSerializable(async (tx) => {
      const profile = await tx.adminProfile.create({
        data: {
          authUserId: data.user.id,
          email: parsed.data.email,
          displayName: parsed.data.displayName,
          role: parsed.data.role,
          createdByAdminId: actor.adminId,
        },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: actor.adminId,
          action: "ADMIN_INVITE",
          entityType: "AdminProfile",
          entityId: profile.id,
          after: { email: parsed.data.email, role: parsed.data.role, redirectTo },
          reason: parsed.data.reason,
        },
      });
    });
  } catch {
    const cleanup = await supabase.auth.admin.deleteUser(data.user.id);
    if (cleanup.error) {
      await runSerializable(async (tx) => {
        await tx.auditLog.create({
          data: {
            actorAdminId: actor.adminId,
            action: "ADMIN_INVITE_RECONCILIATION_REQUIRED",
            entityType: "SupabaseUser",
            entityId: data.user.id,
            outcome: "FAILED",
            errorCode: "PROFILE_AND_CLEANUP_FAILED",
            reason: parsed.data.reason,
            metadata: { email: parsed.data.email },
          },
        });
      }).catch(() => undefined);
      return {
        ok: false,
        code: "RECONCILIATION_REQUIRED",
        message:
          "The profile and automatic identity cleanup failed. Review the reconciliation audit before retrying.",
      };
    }
    return {
      ok: false,
      code: "PROFILE_FAILED_CLEANED",
      message: "The profile could not be created, so the invited identity was removed safely.",
    };
  }

  revalidatePath("/admin/administrators");
  return { ok: true, data: undefined, message: "Administrator invited and profile created." };
}

export async function updateAdministratorAction(
  _state: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const parsed = administratorLifecycleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "A valid operation, reason and explicit confirmation are required.",
    };
  }

  const actor = await requireAdminPermission("administrators.manage");
  try {
    const result = await updateAdministratorLifecycle({
      ...parsed.data,
      actorAdminId: actor.adminId,
    });

    if (!result.ok) {
      const message =
        result.code === "LAST_SUPER_ADMIN"
          ? "The final active super administrator cannot be removed."
          : result.code === "SELF_DEACTIVATE"
            ? "You cannot deactivate your own active session."
          : result.code === "CONFLICT"
            ? "This administrator changed. Refresh before trying again."
            : "Administrator not found.";
      return { ok: false, code: result.code, message };
    }
    revalidatePath("/admin/administrators");
    return { ok: true, data: undefined, message: "Administrator updated." };
  } catch {
    return { ok: false, code: "FAILED", message: "Administrator update failed." };
  }
}
