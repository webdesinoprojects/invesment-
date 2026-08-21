import { z } from "zod";

const reason = z.string().trim().min(3).max(500);
const userId = z.uuid();

export const updateMemberProfileSchema = z
  .object({
    id: userId,
    fullName: z.string().trim().min(2).max(120),
    mobile: z.string().trim().regex(/^\+?[0-9 ()-]{7,24}$/),
    countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
    bep20WalletAddress: z
      .string()
      .trim()
      .max(64)
      .refine((value) => value === "" || value.length >= 3, "Enter a valid UPI ID or payout detail.")
      .transform((value) => value || null),
    reason,
    confirmed: z.literal("true"),
  })
  .strict();

export const createMemberNoteSchema = z
  .object({
    id: userId,
    note: z.string().trim().min(3).max(2000),
  })
  .strict();

export const requestMemberPasswordResetSchema = z
  .object({
    id: userId,
    reason,
    confirmed: z.literal("true"),
  })
  .strict();

export const replaceMemberPinSchema = z
  .object({
    id: userId,
    newPin: z.string().regex(/^\d{4,6}$/),
    confirmPin: z.string().regex(/^\d{4,6}$/),
    reason,
    confirmed: z.literal("true"),
  })
  .strict()
  .refine((value) => value.newPin === value.confirmPin, {
    path: ["confirmPin"],
    message: "PIN confirmation does not match.",
  });

export type UpdateMemberProfileInput = z.infer<typeof updateMemberProfileSchema>;
export type CreateMemberNoteInput = z.infer<typeof createMemberNoteSchema>;
export type ReplaceMemberPinInput = z.infer<typeof replaceMemberPinSchema>;
