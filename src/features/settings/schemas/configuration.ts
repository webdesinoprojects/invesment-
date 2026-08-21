import { z } from "zod";

import { MAX_INVESTMENT_AMOUNT } from "@/features/investment/schemas/activation";
import { compareDecimalStrings } from "@/lib/money/compare-decimal";

const decimalPattern = /^(?:0|[1-9]\d{0,13})(?:\.\d{1,6})?$/;
const percentagePattern = /^(?:0|[1-9]\d{0,2})(?:\.\d{1,4})?$/;

export const positiveMoneySchema = z
  .string()
  .regex(decimalPattern, "Enter a valid amount with up to 6 decimal places.")
  .refine((value) => !/^0(?:\.0+)?$/.test(value), "Amount must be greater than zero.");

export const percentageSchema = z
  .string()
  .regex(percentagePattern, "Enter a valid percentage with up to 4 decimal places.")
  .refine(
    (value) => compareDecimalStrings(value, "100") <= 0,
    "Percentage must be between 0 and 100.",
  );

export const investmentConfigurationSchema = z
  .object({
    minimumAmount: positiveMoneySchema.refine(
      (value) => compareDecimalStrings(value, MAX_INVESTMENT_AMOUNT) <= 0,
      "Minimum investment exceeds the supported investment limit.",
    ),
    monthlyRoiPercent: percentageSchema,
    durationMonths: z.number().int().min(1).max(120),
    directBonusPercent: percentageSchema,
    directMonthlyPercent: percentageSchema,
    levelMonthlyPercent: percentageSchema,
    directQualificationCount: z.number().int().min(1).max(100),
    branchQualificationCount: z.number().int().min(1).max(100),
  })
  .strict();

export const depositConfigurationSchema = z
  .object({
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    network: z.string().trim().min(2).max(16),
    minimumAmount: positiveMoneySchema,
  })
  .strict();

export const withdrawalConfigurationSchema = z
  .object({
    minimumAmount: positiveMoneySchema,
    allowedDays: z.array(z.number().int().min(1).max(31)).min(1).max(31),
    feePercent: percentageSchema,
  })
  .strict()
  .transform((value) => ({
    ...value,
    allowedDays: [...new Set(value.allowedDays)].sort((left, right) => left - right),
  }));

export const configurationSchemas = {
  investment_configuration: investmentConfigurationSchema,
  withdrawal_configuration: withdrawalConfigurationSchema,
  deposit_configuration: depositConfigurationSchema,
} as const;

export type InvestmentConfiguration = z.infer<typeof investmentConfigurationSchema>;
export type DepositConfiguration = z.infer<typeof depositConfigurationSchema>;
export type WithdrawalConfiguration = z.infer<typeof withdrawalConfigurationSchema>;
