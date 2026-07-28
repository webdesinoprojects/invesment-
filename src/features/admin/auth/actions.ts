"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getPrisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminSession, signOutAdmin } from "@/lib/admin/session";

import {
  clearAdminLoginThrottle,
  createLoginThrottleKey,
  isAdminLoginAllowed,
  recordAdminLoginFailure,
} from "./login-rate-limit";

export type AdminLoginState = { error?: string };

const schema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(200),
});
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

  const parsed = schema.safeParse({
    email: normalizedEmail,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    await recordAdminLoginFailure({ key: throttleKey, ipAddress });
    return { error: GENERIC_LOGIN_ERROR };
  }

  const supabase = await createSupabaseServerClient();
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
