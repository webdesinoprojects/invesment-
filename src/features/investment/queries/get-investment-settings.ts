import "server-only";

import { z } from "zod";

import { MAX_INVESTMENT_AMOUNT } from "@/features/investment/schemas/activation";
import { getPrisma } from "@/lib/db/prisma";
import { compareDecimalStrings } from "@/lib/money/compare-decimal";

const percentage = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,2})(?:\.\d{1,4})?$/)
  .refine((value) => Number(value) <= 100);

const investmentSettingsSchema = z.object({
  minimumAmount: z
    .string()
    .regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,6})?$/)
    .refine((value) => !/^0(?:\.0+)?$/.test(value))
    .refine((value) => compareDecimalStrings(value, MAX_INVESTMENT_AMOUNT) <= 0),
  monthlyRoiPercent: percentage,
  durationMonths: z.number().int().min(1).max(120),
  directCommissionPercent: percentage,
  levelCommissionPercent: percentage,
  maxLevelDepth: z.number().int().min(1).max(5),
});

export type InvestmentSettings = z.infer<typeof investmentSettingsSchema>;

const defaultSettings: InvestmentSettings = {
  minimumAmount: "10",
  monthlyRoiPercent: "8",
  durationMonths: 25,
  directCommissionPercent: "1",
  levelCommissionPercent: "0.25",
  maxLevelDepth: 5,
};

export async function getInvestmentSettings(): Promise<InvestmentSettings | null> {
  const setting = await getPrisma().systemSetting.findUnique({
    where: { key: "investment_configuration" },
    select: { value: true },
  });
  if (!setting) return defaultSettings;

  const parsed = investmentSettingsSchema.safeParse(setting.value);
  return parsed.success ? parsed.data : null;
}
