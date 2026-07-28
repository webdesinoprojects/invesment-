import { z } from "zod";

export const administratorLifecycleSchema = z.object({
  id: z.uuid(),
  operation: z.enum(["ACTIVATE", "DEACTIVATE", "ROLE"]),
  role: z.enum(["SUPER_ADMIN", "OPERATOR", "VIEWER"]).default("VIEWER"),
  reason: z.string().trim().min(3).max(500),
  confirmed: z.literal("true"),
});

export type AdministratorLifecycleInput = z.infer<typeof administratorLifecycleSchema>;
