import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { ReferralRestrictionDialog } from "@/features/auth/components/referral-restriction-dialog";
import { RegisterForm } from "@/features/auth/components/register-form";
import { getSponsorPreview } from "@/features/auth/queries/get-sponsor-preview";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const sponsor = await getSponsorPreview(ref);
  const initialInviteId =
    sponsor.state === "found" ? String(sponsor.memberId) : "";
  const initialReferrerName =
    sponsor.state === "found" ? String(sponsor.fullName) : "";

  return (
    <AuthShell
      wide
      title="Create your account"
      description="Register independently or use an eligible partner's invite link."
      footer={
        <>
          Already registered?{" "}
          <Link className="text-primary hover:underline" href="/login">
            Login
          </Link>
        </>
      }
    >
      <ReferralRestrictionDialog
        open={sponsor.state === "found" && !sponsor.isEligible}
      />
      {sponsor.state === "not-found" && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          This referral link is not valid. You can still register without a sponsor.
        </p>
      )}
      <RegisterForm
        key={initialInviteId || "independent"}
        initialInviteId={initialInviteId}
        initialReferrerName={initialReferrerName}
      />
    </AuthShell>
  );
}
