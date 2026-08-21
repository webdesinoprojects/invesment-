import { z } from "zod";

export const changeMemberStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["ACTIVE", "BLOCKED", "ARCHIVED"]),
  reason: z.string().trim().max(500).default(""),
}).superRefine((value, context) => {
  if ((value.status === "BLOCKED" || value.status === "ARCHIVED") && value.reason.length < 3) {
    context.addIssue({ code: "custom", path: ["reason"], message: "A reason is required." });
  }
});
export type ChangeMemberStatusInput = z.infer<typeof changeMemberStatusSchema>;
