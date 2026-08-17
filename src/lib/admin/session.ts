import "server-only";

import { redirect } from "next/navigation";
import type { AdminRole } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";

export type AdminSession = {
  adminId: string;
  authUserId: string;
  email: string;
  displayName: string;
  role: AdminRole;
  expiresAt: number;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createSupabaseAdminServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const authUserId = data?.claims?.sub;
  if (error || !authUserId) return null;
  const admin = await getPrisma().adminProfile.findUnique({
    where: { authUserId },
    select: { id: true, authUserId: true, email: true, displayName: true, role: true, isActive: true },
  });
  if (!admin?.isActive) return null;
  return {
    adminId: admin.id,
    authUserId: admin.authUserId,
    email: admin.email ?? String(data.claims.email ?? ""),
    displayName: admin.displayName,
    role: admin.role,
    expiresAt: Number(data.claims.exp ?? 0) * 1000,
  };
}

export async function requireAdmin(roles?: AdminRole[]) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (roles && !roles.includes(session.role)) redirect("/admin");
  return session;
}

export async function signOutAdmin() {
  const supabase = await createSupabaseAdminServerClient();
  await supabase.auth.signOut();
}
