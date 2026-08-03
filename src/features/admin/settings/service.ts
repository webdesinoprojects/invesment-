import "server-only";

import { Prisma } from "@/generated/prisma/client";

import { runSerializable } from "../shared/transaction";

const settingDescriptions: Record<string, string> = {
  investment_configuration: "Runtime investment, ROI, and referral commission rules.",
  withdrawal_configuration: "Withdrawal limits and permitted India calendar days.",
  deposit_configuration: "USDT BEP-20 deposit wallet and minimum deposit rules.",
};

export async function createSystemSetting(input: {
  key: string;
  value: Prisma.InputJsonValue;
  reason: string;
  adminId: string;
}) {
  return runSerializable(async (tx) => {
    const current = await tx.systemSetting.findUnique({ where: { key: input.key } });
    if (current) return { ok: false as const, code: "EXISTS" as const };

    await tx.systemSetting.create({
      data: {
        key: input.key,
        value: input.value,
        description: settingDescriptions[input.key] ?? null,
        updatedByAdminId: input.adminId,
      },
    });
    await tx.systemSettingRevision.create({
      data: {
        settingKey: input.key,
        version: 1,
        nextValue: input.value,
        reason: input.reason,
        changedByAdminId: input.adminId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorAdminId: input.adminId,
        action: "SYSTEM_SETTING_CREATE",
        entityType: "SystemSetting",
        entityId: input.key,
        after: { version: 1 },
        reason: input.reason,
      },
    });
    return { ok: true as const, version: 1 };
  });
}

export async function updateSystemSetting(input: {
  key: string;
  value: Prisma.InputJsonValue;
  version: number;
  reason: string;
  adminId: string;
}) {
  return runSerializable(async (tx) => {
    const current = await tx.systemSetting.findUnique({ where: { key: input.key } });
    if (!current) return { ok: false as const, code: "NOT_FOUND" as const };
    if (current.version !== input.version) {
      return { ok: false as const, code: "CONFLICT" as const };
    }
    const nextVersion = current.version + 1;
    const updated = await tx.systemSetting.updateMany({
      where: { key: current.key, version: current.version },
      data: {
        value: input.value,
        version: nextVersion,
        updatedByAdminId: input.adminId,
      },
    });
    if (updated.count !== 1) return { ok: false as const, code: "CONFLICT" as const };
    await tx.systemSettingRevision.create({
      data: {
        settingKey: current.key,
        version: nextVersion,
        previousValue: current.value === null ? Prisma.JsonNull : current.value,
        nextValue: input.value,
        reason: input.reason,
        changedByAdminId: input.adminId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorAdminId: input.adminId,
        action: "SYSTEM_SETTING_UPDATE",
        entityType: "SystemSetting",
        entityId: current.key,
        before: { version: current.version },
        after: { version: nextVersion },
        reason: input.reason,
      },
    });
    return { ok: true as const, version: nextVersion };
  });
}
