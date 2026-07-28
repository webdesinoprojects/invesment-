import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminRole } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";

const COOKIE_NAME = "naturepower_admin_session";
const SESSION_SECONDS = 60 * 60 * 8;
export type AdminSession = { adminId: string; email: string; role: AdminRole; expiresAt: number };
function secret() {
  const value = process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY ?? process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("Admin session secret is not configured.");
  return value;
}
function signature(payload: string) { return createHmac("sha256", secret()).update(payload).digest("base64url"); }
function encode(session: AdminSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}
function decode(value?: string): AdminSession | null {
  if (!value) return null;
  const [payload, provided] = value.split(".");
  if (!payload || !provided) return null;
  const expected = signature(payload);
  const a = Buffer.from(provided); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as AdminSession;
    return session.expiresAt > Date.now() ? session : null;
  } catch { return null; }
}
export async function createAdminSession(session: Omit<AdminSession, "expiresAt">) {
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  (await cookies()).set(COOKIE_NAME, encode({ ...session, expiresAt }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/admin", maxAge: SESSION_SECONDS,
  });
}
export async function clearAdminSession() { (await cookies()).delete(COOKIE_NAME); }
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = decode((await cookies()).get(COOKIE_NAME)?.value);
  if (!session) return null;
  const admin = await getPrisma().adminProfile.findUnique({
    where: { id: session.adminId }, select: { isActive: true, role: true, email: true },
  });
  if (!admin?.isActive || admin.email !== session.email) return null;
  return { ...session, role: admin.role };
}
export async function requireAdmin(roles?: AdminRole[]) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (roles && !roles.includes(session.role)) redirect("/admin");
  return session;
}
