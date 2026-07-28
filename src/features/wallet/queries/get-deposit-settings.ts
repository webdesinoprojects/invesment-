import "server-only";

import {
  depositConfigurationSchema,
  type DepositConfiguration,
} from "@/features/settings/schemas/configuration";
import { getPrisma } from "@/lib/db/prisma";

export type DepositSettings = DepositConfiguration;

export async function getDepositSettings(): Promise<DepositSettings | null> {
  const setting = await getPrisma().systemSetting.findUnique({
    where: { key: "deposit_configuration" },
    select: { value: true },
  });
  if (!setting) {
    return null;
  }

  const parsed = depositConfigurationSchema.safeParse(setting.value);
  return parsed.success ? parsed.data : null;
}
