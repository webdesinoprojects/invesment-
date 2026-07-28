import "server-only";

import {
  can,
  type AdminPermission,
} from "@/features/admin/permissions";
import { requireAdmin } from "@/lib/admin/session";

export { can };
export type { AdminPermission };

export async function requireAdminPermission(permission: AdminPermission) {
  const admin = await requireAdmin();
  if (!can(admin.role, permission)) {
    throw new Error("ADMIN_FORBIDDEN");
  }
  return admin;
}
