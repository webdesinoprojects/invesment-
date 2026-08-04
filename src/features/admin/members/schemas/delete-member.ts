import { z } from "zod";

export const deleteMemberSchema = z
  .object({
    id: z.uuid(),
    memberId: z.string().trim().regex(/^NP[0-9]{6}$/),
    confirmation: z.string().trim(),
    reason: z.string().trim().min(3).max(500),
    confirmed: z.literal("true"),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.confirmation !== value.memberId) {
      context.addIssue({
        code: "custom",
        path: ["confirmation"],
        message: "Enter the exact member ID to confirm deletion.",
      });
    }
  });

export type DeleteMemberInput = z.infer<typeof deleteMemberSchema>;
