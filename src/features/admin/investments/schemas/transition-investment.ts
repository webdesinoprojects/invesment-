import { z } from "zod";
export const transitionInvestmentSchema = z.object({
  id: z.uuid(),
  status: z.enum(["ACTIVE", "PAUSED", "CANCELLED"]),
  reason: z.string().trim().max(500).default(""),
}).superRefine((value, context) => {
  if ((value.status === "PAUSED" || value.status === "CANCELLED") && value.reason.length < 3) {
    context.addIssue({ code: "custom", path: ["reason"], message: "A reason is required." });
  }
});
export type TransitionInvestmentInput = z.infer<typeof transitionInvestmentSchema>;
