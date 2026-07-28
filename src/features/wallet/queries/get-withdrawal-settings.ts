import "server-only";

import {
  withdrawalConfigurationSchema,
  type WithdrawalConfiguration,
} from "@/features/settings/schemas/configuration";
import { getPrisma } from "@/lib/db/prisma";

export type WithdrawalSettings = WithdrawalConfiguration;

const defaultSettings: WithdrawalSettings = {
  minimumAmount: "10",
  allowedDays: [1, 16],
};

export async function getWithdrawalSettings(): Promise<WithdrawalSettings | null> {
  const setting = await getPrisma().systemSetting.findUnique({
    where: { key: "withdrawal_configuration" },
    select: { value: true },
  });
  if (!setting) {
    return defaultSettings;
  }

  const parsed = withdrawalConfigurationSchema.safeParse(setting.value);
  if (!parsed.success) return null;
  return parsed.data;
}
