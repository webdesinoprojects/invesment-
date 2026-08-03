"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getPrisma } from "@/lib/db/prisma";
import {
  createSupabaseServerClient,
  setSessionPersistencePreference,
} from "@/lib/supabase/server";
import { getAdminSession, signOutAdmin } from "@/lib/admin/session";

import {
  clearAdminLoginThrottle,
  createLoginThrottleKey,
  isAdminLoginAllowed,
  recordAdminLoginFailure,
} from "./login-rate-limit";
import {
  adminInviteAcceptanceSchema,
  adminLoginSchema,
} from "./schemas";

export type AdminLoginState = { error?: string };
export type AdminInviteAcceptanceState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const GENERIC_LOGIN_ERROR = "Unable to sign in with those credentials.";

export async function adminLoginAction(
  _state: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const requestHeaders = await headers();
  const ipAddress = getClientIp(requestHeaders);
  const normalizedEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  const throttleKey = createLoginThrottleKey(normalizedEmail, ipAddress);
  if (!(await isAdminLoginAllowed(throttleKey))) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  const parsed = adminLoginSchema.safeParse({
    email: normalizedEmail,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    await recordAdminLoginFailure({ key: throttleKey, ipAddress });
    return { error: GENERIC_LOGIN_ERROR };
  }

  const supabase = await createSupabaseServerClient("session");
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    await recordAdminLoginFailure({ key: throttleKey, ipAddress });
    return { error: GENERIC_LOGIN_ERROR };
  }

  const admin = await getPrisma().adminProfile.findUnique({
    where: { authUserId: data.user.id },
    select: { id: true, isActive: true },
  });
  if (!admin?.isActive) {
    await supabase.auth.signOut();
    await recordAdminLoginFailure({ key: throttleKey, ipAddress });
    return { error: GENERIC_LOGIN_ERROR };
  }

  await setSessionPersistencePreference("session");
  await getPrisma().$transaction([
    getPrisma().adminProfile.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    }),
    getPrisma().auditLog.create({
      data: {
        actorAdminId: admin.id,
        action: "ADMIN_LOGIN",
        entityType: "AdminProfile",
        entityId: admin.id,
        ipAddress: ipAddress === "unknown" ? null : ipAddress.slice(0, 64),
        userAgent: requestHeaders.get("user-agent")?.slice(0, 500) ?? null,
      },
    }),
  ]);
  await clearAdminLoginThrottle(throttleKey);
  redirect("/admin");
}

export async function acceptAdminInvitationAction(
  _state: AdminInviteAcceptanceState,
  formData: FormData,
): Promise<AdminInviteAcceptanceState> {
  const parsed = adminInviteAcceptanceSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      error: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient("session");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: "This invitation is invalid or has expired. Request a new invitation." };
  }

  const admin = await getPrisma().adminProfile.findUnique({
    where: { authUserId: data.user.id },
    select: { id: true, isActive: true },
  });
  if (!admin?.isActive) {
    await supabase.auth.signOut();
    return { error: "This administrator invitation is no longer active." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (updateError) {
    return { error: "The password could not be saved. Request a new invitation and try again." };
  }

  const requestHeaders = await headers();
  const ipAddress = getClientIp(requestHeaders);
  await setSessionPersistencePreference("session");
  await getPrisma().$transaction([
    getPrisma().adminProfile.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    }),
    getPrisma().auditLog.create({
      data: {
        actorAdminId: admin.id,
        action: "ADMIN_INVITE_ACCEPT",
        entityType: "AdminProfile",
        entityId: admin.id,
        ipAddress: ipAddress === "unknown" ? null : ipAddress.slice(0, 64),
        userAgent: requestHeaders.get("user-agent")?.slice(0, 500) ?? null,
      },
    }),
  ]);

  redirect("/admin");
}

export async function adminLogoutAction() {
  const session = await getAdminSession();
  if (session) {
    await getPrisma().auditLog.create({
      data: {
        actorAdminId: session.adminId,
        action: "ADMIN_LOGOUT",
        entityType: "AdminProfile",
        entityId: session.adminId,
      },
    });
  }
  await signOutAdmin();
  redirect("/admin/login");
}

function getClientIp(requestHeaders: Headers) {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    requestHeaders.get("x-real-ip")?.trim() ||
    requestHeaders.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}
