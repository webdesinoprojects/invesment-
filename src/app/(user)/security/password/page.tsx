import { KeyRound } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { PasswordChangeForm } from "@/features/profile/components/password-change-form";

export const metadata: Metadata = { title: "Change Password" };

export default function PasswordSecurityPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <PageHeader title="Security Center" description="Change your profile password securely." />
      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-primary/30 bg-card p-5 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-md bg-primary/10">
              <KeyRound className="size-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-semibold">Change profile password</h2>
            <p className="mt-2 text-sm text-muted-foreground">Your current password is required.</p>
          </section>
        </aside>
        <section className="rounded-lg border border-primary/30 bg-card p-5">
          <h2 className="border-b border-border pb-4 text-lg font-semibold">Update password</h2>
          <div className="mt-5"><PasswordChangeForm /></div>
        </section>
      </div>
    </main>
  );
}
