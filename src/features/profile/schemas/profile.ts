import { z } from "zod";

import { passwordSchema, securityPinSchema } from "@/features/auth/schemas/auth";

export const walletAddressSchema = z.object({
  walletAddress: z
    .string()
    .trim()
    .max(64, "Wallet address is too long.")
    .refine(
      (value) => value === "" || /^0x[a-fA-F0-9]{40}$/.test(value),
      "Enter a valid BEP-20 wallet address.",
    ),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current password.",
  });

export const securityPinChangeSchema = z
  .object({
    currentSecurityPin: securityPinSchema,
    newSecurityPin: securityPinSchema,
    confirmSecurityPin: z.string(),
  })
  .refine((data) => data.newSecurityPin === data.confirmSecurityPin, {
    path: ["confirmSecurityPin"],
    message: "Security PINs do not match.",
  })
  .refine((data) => data.currentSecurityPin !== data.newSecurityPin, {
    path: ["newSecurityPin"],
    message: "New security PIN must be different from the current PIN.",
  });
