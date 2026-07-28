"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminSession, signOutAdmin } from "@/lib/admin/session";

export type AdminLoginState = { error?: string };
const schema = z.object({ email: z.email().trim().toLowerCase(), password: z.string().min(8).max(200) });

export async function adminLoginAction(_state: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "Invalid administrator credentials." };

  const admin = await getPrisma().adminProfile.findUnique({
    where: { authUserId: data.user.id },
    select: { id: true, isActive: true },
  });
  if (!admin?.isActive) {
    await supabase.auth.signOut();
    return { error: "This account is not an active administrator." };
  }
  await getPrisma().$transaction([
    getPrisma().adminProfile.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } }),
    getPrisma().auditLog.create({
      data: { actorAdminId: admin.id, action: "ADMIN_LOGIN", entityType: "AdminProfile", entityId: admin.id },
    }),
  ]);
  redirect("/admin");
}

export async function adminLogoutAction() {
  const session = await getAdminSession();
  if (session) {
    await getPrisma().auditLog.create({
      data: { actorAdminId: session.adminId, action: "ADMIN_LOGOUT", entityType: "AdminProfile", entityId: session.adminId },
    });
  }
  await signOutAdmin();
  redirect("/admin/login");
}
