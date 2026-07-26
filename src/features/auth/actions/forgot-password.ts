"use server";

import { forgotPasswordSchema } from "@/features/auth/schemas/auth";
import { getServerEnv, isAuthConfigured } from "@/lib/env/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";

import { serviceUnavailable, validationFailure } from "./action-helpers";

export async function forgotPasswordAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }
  if (!isAuthConfigured()) {
    return serviceUnavailable();
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getServerEnv().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/reset-password`,
  });

  return {
    ok: true,
    code: "SUCCESS",
    data: undefined,
    message:
      "If an account exists for that email, a reset link has been sent.",
  };
}
