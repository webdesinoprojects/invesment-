import { z } from "zod";
export const adminNotificationResponseSchema=z.object({
 count:z.number().int().nonnegative(),
 items:z.array(z.object({
  id:z.string().min(1),type:z.enum(["MEMBER","DEPOSIT","WITHDRAWAL","ROI"]),
  title:z.string().min(1),detail:z.string().min(1),href:z.string().startsWith("/admin/"),createdAt:z.iso.datetime(),
 })),
});
export type AdminNotificationResponse=z.infer<typeof adminNotificationResponseSchema>;
