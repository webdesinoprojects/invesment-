import { z } from "zod";

export const withdrawalRequestSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(
      /^(?:0|[1-9]\d{0,13})(?:\.\d{1,6})?$/,
      "Enter a valid USDT amount with up to 14 whole digits and 6 decimals.",
    )
    .refine((value) => !/^0(?:\.0+)?$/.test(value), "Amount must be greater than zero."),
  securityPin: z
    .string()
    .regex(/^\d{4,6}$/, "Security PIN must be 4 to 6 digits."),
  requestToken: z.uuid("Invalid withdrawal request token."),
});

export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;
