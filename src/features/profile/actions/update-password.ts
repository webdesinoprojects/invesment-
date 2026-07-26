"use server";

import { validationFailure } from "@/features/auth/actions/action-helpers";
import { passwordChangeSchema } from "@/features/profile/schemas/profile";
import { requireUser } from "@/lib/auth/require-user";
import { getPrisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";

export async function updatePasswordAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  const user = await requireUser();
  const profile = await getPrisma().userProfile.findUnique({
    where: { id: user.id },
    select: { email: true },
  });
  if (!profile) return failure("PROFILE_NOT_FOUND", "Your profile could not be loaded.");

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: parsed.data.currentPassword,
  });
  if (signInError) {
    return {
      ...failure("INVALID_CURRENT_PASSWORD", "The current password is incorrect."),
      fieldErrors: { currentPassword: ["Incorrect current password."] },
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (updateError) return failure("PASSWORD_UPDATE_FAILED", "Password could not be updated. Try again.");

  await getPrisma().auditLog.create({
    data: {
      targetUserId: user.id,
      action: "USER_PASSWORD_UPDATED",
      entityType: "UserProfile",
      entityId: user.id,
    },
  }).catch(() => undefined);

  return {
    ok: true,
    code: "SUCCESS",
    data: undefined,
    message: "Profile password updated.",
  };
}

function failure(code: string, message: string): Extract<ActionResult, { ok: false }> {
  return { ok: false, code, message };
}
