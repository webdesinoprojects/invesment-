import "server-only";

import { z } from "zod";

import { getPrisma } from "@/lib/db/prisma";

const withdrawalSettingsSchema = z.object({
  minimumAmount: z
    .string()
    .regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,6})?$/)
    .refine((value) => !/^0(?:\.0+)?$/.test(value)),
  allowedDays: z.array(z.number().int().min(1).max(31)).min(1).max(31),
});

export type WithdrawalSettings = z.infer<typeof withdrawalSettingsSchema>;

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

  const parsed = withdrawalSettingsSchema.safeParse(setting.value);
  if (!parsed.success) return null;

  return {
    ...parsed.data,
    allowedDays: [...new Set(parsed.data.allowedDays)].sort((a, b) => a - b),
  };
}
