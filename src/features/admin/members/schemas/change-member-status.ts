import { z } from "zod";

export const changeMemberStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["ACTIVE", "BLOCKED"]),
  reason: z.string().trim().max(500).default(""),
}).superRefine((value, context) => {
  if (value.status === "BLOCKED" && value.reason.length < 3) {
    context.addIssue({ code: "custom", path: ["reason"], message: "A blocking reason is required." });
  }
});
export type ChangeMemberStatusInput = z.infer<typeof changeMemberStatusSchema>;
