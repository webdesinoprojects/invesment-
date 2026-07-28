import { z } from "zod";
import { MAX_INVESTMENT_AMOUNT } from "@/features/investment/schemas/activation";
import { compareDecimalStrings } from "@/lib/money/compare-decimal";

export const manualActivationSchema = z.object({
  userId: z.uuid(),
  amount: z
    .string()
    .trim()
    .regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,6})?$/)
    .refine((value) => !/^0(?:\.0+)?$/.test(value))
    .refine((value) => compareDecimalStrings(value, MAX_INVESTMENT_AMOUNT) <= 0),
  reason: z.string().trim().min(3).max(500),
  requestToken: z.uuid(),
  confirmed: z.literal("true"),
});

export const manualActivationSearchSchema = z.string().trim().min(2).max(254);
