import "server-only";

import { runSerializable } from "../shared/transaction";
import type { AdministratorLifecycleInput } from "./schemas";

export async function updateAdministratorLifecycle(
  input: AdministratorLifecycleInput & { actorAdminId: string },
) {
  return runSerializable(async (tx) => {
    const target = await tx.adminProfile.findUnique({ where: { id: input.id } });
    if (!target) return { ok: false as const, code: "NOT_FOUND" as const };
    if (target.id === input.actorAdminId && input.operation === "DEACTIVATE") {
      return { ok: false as const, code: "SELF_DEACTIVATE" as const };
    }

    const removesActiveSuperAdmin =
      target.isActive &&
      target.role === "SUPER_ADMIN" &&
      (input.operation === "DEACTIVATE" ||
        (input.operation === "ROLE" && input.role !== "SUPER_ADMIN"));
    if (removesActiveSuperAdmin) {
      const activeSuperAdmins = await tx.adminProfile.count({
        where: { role: "SUPER_ADMIN", isActive: true },
      });
      if (activeSuperAdmins <= 1) {
        return { ok: false as const, code: "LAST_SUPER_ADMIN" as const };
      }
    }

    const data =
      input.operation === "DEACTIVATE"
        ? {
            isActive: false,
            deactivatedAt: new Date(),
            deactivationReason: input.reason,
            deactivatedByAdminId: input.actorAdminId,
          }
        : input.operation === "ACTIVATE"
          ? {
              isActive: true,
              deactivatedAt: null,
              deactivationReason: null,
              deactivatedByAdminId: null,
            }
          : { role: input.role };
    const updated = await tx.adminProfile.updateMany({
      where: {
        id: target.id,
        role: target.role,
        isActive: target.isActive,
        updatedAt: target.updatedAt,
      },
      data,
    });
    if (updated.count !== 1) return { ok: false as const, code: "CONFLICT" as const };

    await tx.auditLog.create({
      data: {
        actorAdminId: input.actorAdminId,
        action: `ADMIN_${input.operation}`,
        entityType: "AdminProfile",
        entityId: target.id,
        before: { role: target.role, isActive: target.isActive },
        after: data,
        reason: input.reason,
      },
    });
    return { ok: true as const };
  });
}
