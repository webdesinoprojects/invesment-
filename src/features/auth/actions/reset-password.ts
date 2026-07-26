"use server";

import { cookies } from "next/headers";

import { validationFailure } from "@/features/auth/actions/action-helpers";
import { resetPasswordSchema } from "@/features/auth/schemas/auth";
import { verifyPasswordRecoveryToken } from "@/lib/security/password-recovery-token";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";

export async function resetPasswordAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  const [cookieStore, supabase] = await Promise.all([
    cookies(),
    createSupabaseServerClient(),
  ]);
  const { data } = await supabase.auth.getClaims();
  const authUserId = data?.claims?.sub;
  const recoveryToken = cookieStore.get("np_password_recovery")?.value;
  if (!authUserId || !recoveryToken || !verifyPasswordRecoveryToken(recoveryToken, authUserId)) {
    return failure("RECOVERY_EXPIRED", "This recovery link has expired. Request a new one.");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return failure("PASSWORD_RESET_FAILED", "Password could not be reset. Try again.");

  cookieStore.delete("np_password_recovery");
  await supabase.auth.signOut({ scope: "local" });
  return {
    ok: true,
    code: "SUCCESS",
    data: undefined,
    message: "Password reset. You can now sign in with the new password.",
  };
}

function failure(code: string, message: string): Extract<ActionResult, { ok: false }> {
  return { ok: false, code, message };
}
