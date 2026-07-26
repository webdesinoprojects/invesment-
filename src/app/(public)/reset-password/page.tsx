import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      description="The recovery link remains valid for 15 minutes."
      footer={
        <Link className="text-primary hover:underline" href="/login">
          Return to login
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
