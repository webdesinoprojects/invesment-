import { z } from "zod";

import { compareDecimalStrings } from "@/lib/money/compare-decimal";

export const MAX_INVESTMENT_AMOUNT = "49999999999999.999999";

export const memberIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^NP\d{6,10}$/, "Enter a valid member ID.");

export const activationSchema = z.object({
  memberId: memberIdSchema,
  amount: z
    .string()
    .trim()
    .regex(
      /^(?:0|[1-9]\d{0,13})(?:\.\d{1,6})?$/,
      "Enter a valid USDT amount with up to 14 whole digits and 6 decimals.",
    )
    .refine((value) => !/^0(?:\.0+)?$/.test(value), "Amount must be greater than zero.")
    .refine(
      (value) => compareDecimalStrings(value, MAX_INVESTMENT_AMOUNT) <= 0,
      "Amount exceeds the supported investment limit.",
    ),
  securityPin: z
    .string()
    .regex(/^\d{4,6}$/, "Security PIN must be 4 to 6 digits."),
  requestToken: z.uuid("Invalid activation request token."),
});

export type ActivationInput = z.infer<typeof activationSchema>;
