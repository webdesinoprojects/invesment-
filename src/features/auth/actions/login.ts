"use server";

import { redirect } from "next/navigation";

import { validationFailure, serviceUnavailable } from "./action-helpers";
import { loginSchema } from "@/features/auth/schemas/auth";
import { getPrisma } from "@/lib/db/prisma";
import { isAuthConfigured } from "@/lib/env/server";
import {
  createSupabaseServerClient,
  setSessionPersistencePreference,
} from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";

function safeRedirectPath(value: string | undefined): string {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export async function loginAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    loginId: formData.get("loginId"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }
  if (!isAuthConfigured()) {
    return serviceUnavailable();
  }

  const loginId = parsed.data.loginId.trim();
  const profile = await getPrisma().userProfile.findUnique({
    where: loginId.includes("@")
      ? { email: loginId.toLowerCase() }
      : { memberId: loginId.toUpperCase() },
    select: { email: true, status: true },
  });
  if (!profile || profile.status === "BLOCKED") {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "Invalid login ID or password.",
    };
  }

  const persistence = parsed.data.rememberMe ? "persistent" : "session";
  const supabase = await createSupabaseServerClient(persistence);
  const { error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: parsed.data.password,
  });
  if (error) {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "Invalid login ID or password.",
    };
  }

  await setSessionPersistencePreference(persistence);
  redirect(safeRedirectPath(parsed.data.next));
}
