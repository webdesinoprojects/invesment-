import { z } from "zod";

import { countries } from "@/features/auth/constants/countries";
import { normalizeMobileNumber } from "@/features/auth/services/normalize-mobile-number";

const supportedCountryCodes = countries.map((country) => country.code) as [
  (typeof countries)[number]["code"],
  ...(typeof countries)[number]["code"][],
];

const memberId = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^NP\d{6,10}$/, "Enter a valid invite ID.");

const optionalMemberId = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  memberId.optional(),
);

export const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .max(64, "Password cannot exceed 64 characters.")
  .regex(/[A-Za-z]/, "Password must include a letter.")
  .regex(/\d/, "Password must include a number.");

export const securityPinSchema = z
  .string()
  .regex(/^\d{4,6}$/, "Security PIN must be 4 to 6 digits.");

export const loginSchema = z.object({
  loginId: z.string().trim().min(3, "Enter your email or member ID."),
  password: z.string().min(1, "Enter your password."),
  rememberMe: z.preprocess(
    (value) => value === true || value === "true" || value === "on",
    z.boolean(),
  ),
  next: z.string().optional(),
});

export const registerSchema = z
  .object({
    inviteId: optionalMemberId,
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
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(z.enum(supportedCountryCodes, "Select a valid country.")),
    mobile: z
      .string()
      .trim()
      .min(1, "Enter your mobile number.")
      .max(32, "Mobile number is too long."),
    password: passwordSchema,
    confirmPassword: z.string(),
    securityPin: securityPinSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
  .superRefine((data, context) => {
    if (!normalizeMobileNumber(data.mobile, data.countryCode)) {
      context.addIssue({
        code: "custom",
        path: ["mobile"],
        message: "Enter a valid mobile number for the selected country.",
      });
    }
  })
  .transform((data) => ({
    ...data,
    mobile: normalizeMobileNumber(data.mobile, data.countryCode)!,
  }));

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address.").transform((value) =>
    value.toLowerCase(),
  ),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
