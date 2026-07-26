import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset password"
      description="Enter the email attached to your account."
      footer={
        <Link className="text-primary hover:underline" href="/login">
          Return to login
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
