import "server-only";

import { z } from "zod";

import { getPrisma } from "@/lib/db/prisma";

const depositSettingsSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  network: z.string().min(2).max(16).default("BSC (BEP-20)"),
  minimumAmount: z
    .string()
    .regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,6})?$/)
    .refine((value) => !/^0(?:\.0+)?$/.test(value))
    .default("10"),
});

export type DepositSettings = z.infer<typeof depositSettingsSchema>;

export async function getDepositSettings(): Promise<DepositSettings | null> {
  const setting = await getPrisma().systemSetting.findUnique({
    where: { key: "deposit_configuration" },
    select: { value: true },
  });
  if (!setting) {
    return null;
  }

  const parsed = depositSettingsSchema.safeParse(setting.value);
  return parsed.success ? parsed.data : null;
}
