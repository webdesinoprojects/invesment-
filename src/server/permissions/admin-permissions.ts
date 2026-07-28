import "server-only";

import type { AdminRole } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin/session";

export type AdminPermission =
  | "admin.view"
  | "members.manage"
  | "deposits.review"
  | "withdrawals.process"
  | "investments.manage"
  | "investments.manual"
  | "roi.run"
  | "wallet.adjust"
  | "settings.manage"
  | "administrators.manage"
  | "audit.view";

const permissions: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  SUPER_ADMIN: new Set([
    "admin.view", "members.manage", "deposits.review", "withdrawals.process",
    "investments.manage", "investments.manual", "roi.run", "wallet.adjust",
    "settings.manage", "administrators.manage", "audit.view",
  ]),
  OPERATOR: new Set([
    "admin.view", "members.manage", "deposits.review", "withdrawals.process",
    "investments.manage", "audit.view",
  ]),
  VIEWER: new Set(["admin.view"]),
};

export function can(role: AdminRole, permission: AdminPermission): boolean {
  return permissions[role].has(permission);
}

export async function requireAdminPermission(permission: AdminPermission) {
  const admin = await requireAdmin();
  if (!can(admin.role, permission)) {
    throw new Error("ADMIN_FORBIDDEN");
  }
  return admin;
}
