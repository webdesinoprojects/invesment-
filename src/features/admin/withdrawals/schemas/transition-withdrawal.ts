import { z } from "zod";

const paymentReference = z.string().trim().min(3, "Enter the external payment reference.").max(128);

export const transitionWithdrawalSchema = z.discriminatedUnion("transition", [
  z.object({ id: z.uuid(), transition: z.literal("PROCESS"), reason: z.string().trim().max(500).default("Reviewed for external payment.") }),
  z.object({ id: z.uuid(), transition: z.literal("PAY"), paymentHash: paymentReference, reason: z.string().trim().max(500).default("") }),
  z.object({ id: z.uuid(), transition: z.literal("REJECT"), reason: z.string().trim().min(3).max(500) }),
  z.object({ id: z.uuid(), transition: z.literal("FAIL"), reason: z.string().trim().min(3).max(500) }),
]);

export type TransitionWithdrawalInput = z.infer<typeof transitionWithdrawalSchema>;
