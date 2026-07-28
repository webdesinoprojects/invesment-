import { z } from "zod";

import { positiveMoneySchema } from "@/features/settings/schemas/configuration";

export const walletAdjustmentSchema = z
  .object({
    userId: z.uuid(),
    operation: z.enum(["CREDIT", "DEBIT"]),
    amount: positiveMoneySchema,
    reason: z.string().trim().min(3).max(500),
    idempotencyKey: z.uuid(),
    confirmed: z.literal("true"),
  })
  .strict();

export const walletReversalSchema = z
  .object({
    entryId: z.uuid(),
    reason: z.string().trim().min(3).max(500),
    idempotencyKey: z.uuid(),
    confirmed: z.literal("true"),
  })
  .strict();

export type WalletAdjustmentInput = z.infer<typeof walletAdjustmentSchema>;
export type WalletReversalInput = z.infer<typeof walletReversalSchema>;
