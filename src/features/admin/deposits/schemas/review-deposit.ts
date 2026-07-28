import { z } from "zod";

export const reviewDepositSchema = z.object({
  id: z.uuid(),
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(500).default(""),
}).superRefine((value, context) => {
  if (value.decision === "REJECT" && value.reason.length < 3) {
    context.addIssue({ code: "custom", path: ["reason"], message: "A rejection reason is required." });
  }
});

export type ReviewDepositInput = z.infer<typeof reviewDepositSchema>;
