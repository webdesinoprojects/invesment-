import { z } from "zod";

export const reviewDepositSchema = z.object({
  id: z.uuid(),
  decision: z.literal("REJECT"),
  reason: z.string().trim().max(500).default(""),
  confirmed: z.literal("true"),
}).superRefine((value, context) => {
  if (value.reason.length < 3) {
    context.addIssue({ code: "custom", path: ["reason"], message: "A rejection reason is required." });
  }
});

export type ReviewDepositInput = z.infer<typeof reviewDepositSchema>;
