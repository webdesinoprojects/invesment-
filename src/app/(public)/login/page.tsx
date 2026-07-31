import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; authError?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in with your email address or NEX-GEN POWER member ID."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link className="text-primary hover:underline" href="/register">
            Register
          </Link>
        </>
      }
    >
      {params.authError === "1" && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          The authentication link is invalid or expired. Please try again.
        </p>
      )}
      <LoginForm {...(params.next ? { next: params.next } : {})} />
    </AuthShell>
  );
}
