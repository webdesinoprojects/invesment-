import "server-only";

import {
  investmentConfigurationSchema,
  type InvestmentConfiguration,
} from "@/features/settings/schemas/configuration";
import { getPrisma } from "@/lib/db/prisma";

export type InvestmentSettings = InvestmentConfiguration;

const defaultSettings: InvestmentSettings = {
  minimumAmount: "10",
  monthlyRoiPercent: "8",
  durationMonths: 25,
  directBonusPercent: "5",
  directMonthlyPercent: "1",
  levelMonthlyPercent: "0.25",
  directQualificationCount: 5,
  branchQualificationCount: 5,
};

export async function getInvestmentSettings(): Promise<InvestmentSettings | null> {
  const setting = await getPrisma().systemSetting.findUnique({
    where: { key: "investment_configuration" },
    select: { value: true },
  });
  if (!setting) return defaultSettings;

  const parsed = investmentConfigurationSchema.safeParse(setting.value);
  return parsed.success ? parsed.data : null;
}
