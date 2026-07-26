import { z } from "zod";

const memberId = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^NP\d{6,10}$/, "Enter a valid invite ID.");

const password = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .max(64, "Password cannot exceed 64 characters.")
  .regex(/[A-Za-z]/, "Password must include a letter.")
  .regex(/\d/, "Password must include a number.");

export const loginSchema = z.object({
  loginId: z.string().trim().min(3, "Enter your email or member ID."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export const registerSchema = z
  .object({
    inviteId: memberId,
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(120, "Full name is too long."),
    email: z.email("Enter a valid email address.").transform((value) =>
      value.toLowerCase(),
    ),
    countryCode: z
      .string()
      .length(2, "Select a country.")
      .transform((value) => value.toUpperCase()),
    mobile: z
      .string()
      .trim()
      .regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid mobile number."),
    password,
    confirmPassword: z.string(),
    securityPin: z
      .string()
      .regex(/^\d{4,6}$/, "Security PIN must be 4 to 6 digits."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address.").transform((value) =>
    value.toLowerCase(),
  ),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
