"use server";
import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminSession, clearAdminSession } from "@/lib/admin/session";
import { getPrisma } from "@/lib/db/prisma";

export type AdminLoginState = { error?: string };
const schema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
function equal(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function deterministicUuid(input: string) {
  const hex = createHash("sha256").update(input).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}
export async function adminLoginAction(_state: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const configuredEmail = process.env.ADMIN_EMAIL;
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredEmail || !configuredPassword ||
      !equal(parsed.data.email.toLowerCase(), configuredEmail.toLowerCase()) ||
      !equal(parsed.data.password, configuredPassword)) return { error: "Invalid administrator credentials." };
  const prisma = getPrisma();
  const authUserId = deterministicUuid(configuredEmail.toLowerCase());
  const admin = await prisma.adminProfile.upsert({
    where: { authUserId },
    create: { authUserId, email: configuredEmail.toLowerCase(), displayName: "Platform Administrator", role: "SUPER_ADMIN", isActive: true, lastLoginAt: new Date() },
    update: { lastLoginAt: new Date() },
  });
  if (!admin.isActive) return { error: "This administrator is disabled." };
  await createAdminSession({ adminId: admin.id, email: admin.email ?? configuredEmail, role: admin.role });
  redirect("/admin");
}
export async function adminLogoutAction() { await clearAdminSession(); redirect("/admin/login"); }
