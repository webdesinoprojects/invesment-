import type { AdminRole } from "@/generated/prisma/client";

export type AdminPermission =
  | "admin.view"
  | "members.view"
  | "members.manage"
  | "members.sensitive"
  | "deposits.view"
  | "deposits.review"
  | "withdrawals.view"
  | "withdrawals.process"
  | "investments.view"
  | "investments.manage"
  | "investments.manual"
  | "roi.view"
  | "roi.run"
  | "wallet.view"
  | "wallet.adjust"
  | "income.view"
  | "referrals.view"
  | "reports.view"
  | "reports.export"
  | "settings.view"
  | "settings.manage"
  | "administrators.view"
  | "administrators.manage"
  | "audit.view"
  | "health.view";

const permissionMatrix: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  SUPER_ADMIN: new Set([
    "admin.view",
    "members.view",
    "members.manage",
    "members.sensitive",
    "deposits.view",
    "deposits.review",
    "withdrawals.view",
    "withdrawals.process",
    "investments.view",
    "investments.manage",
    "investments.manual",
    "roi.view",
    "roi.run",
    "wallet.view",
    "wallet.adjust",
    "income.view",
    "referrals.view",
    "reports.view",
    "reports.export",
    "settings.view",
    "settings.manage",
    "administrators.view",
    "administrators.manage",
    "audit.view",
    "health.view",
  ]),
  OPERATOR: new Set([
    "admin.view",
    "members.view",
    "members.manage",
    "deposits.view",
    "deposits.review",
    "withdrawals.view",
    "withdrawals.process",
    "investments.view",
    "investments.manage",
    "roi.view",
    "wallet.view",
    "income.view",
    "referrals.view",
    "reports.view",
    "reports.export",
    "health.view",
  ]),
  VIEWER: new Set([
    "admin.view",
    "members.view",
    "deposits.view",
    "withdrawals.view",
    "investments.view",
    "roi.view",
    "wallet.view",
    "income.view",
    "referrals.view",
    "reports.view",
  ]),
};

export function can(role: AdminRole, permission: AdminPermission): boolean {
  return permissionMatrix[role].has(permission);
}
