import { z } from "zod";

const hash = z.string().trim().regex(/^0x[a-fA-F0-9]{64}$/, "Enter a valid 66-character BSC transaction hash.");

export const transitionWithdrawalSchema = z.discriminatedUnion("transition", [
  z.object({ id: z.uuid(), transition: z.literal("PROCESS"), reason: z.string().trim().max(500).default("Reviewed for external payment.") }),
  z.object({ id: z.uuid(), transition: z.literal("PAY"), paymentHash: hash.transform((value) => value.toLowerCase()), reason: z.string().trim().max(500).default("") }),
  z.object({ id: z.uuid(), transition: z.literal("REJECT"), reason: z.string().trim().min(3).max(500) }),
  z.object({ id: z.uuid(), transition: z.literal("FAIL"), reason: z.string().trim().min(3).max(500) }),
]);

export type TransitionWithdrawalInput = z.infer<typeof transitionWithdrawalSchema>;
