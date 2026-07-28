import { z } from "zod";
export const manualActivationSchema = z.object({
  memberQuery: z.string().trim().min(2).max(254),
  amount: z.string().trim().regex(/^\d+(\.\d{1,6})?$/),
  reason: z.string().trim().min(3).max(500),
  requestToken: z.uuid(),
});
