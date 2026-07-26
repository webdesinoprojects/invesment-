import { z } from "zod";

export const depositRequestSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(
      /^(?:0|[1-9]\d{0,13})(?:\.\d{1,6})?$/,
      "Enter a valid USDT amount with up to 14 whole digits and 6 decimals.",
    )
    .refine((value) => !/^0(?:\.0+)?$/.test(value), "Amount must be greater than zero."),
  transactionHash: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{64}$/, "Enter a valid BSC transaction hash."),
});

export type DepositRequestInput = z.infer<typeof depositRequestSchema>;
