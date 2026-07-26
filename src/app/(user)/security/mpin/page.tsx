import { LockKeyhole, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { SecurityPinChangeForm } from "@/features/profile/components/security-pin-change-form";

export const metadata: Metadata = { title: "Change MPIN" };

export default function MpinSecurityPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <PageHeader title="Security Center" description="Change the MPIN used to authorize money actions." />
      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-primary/30 bg-card p-5 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-md bg-primary/10">
              <LockKeyhole className="size-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-semibold">Change security MPIN</h2>
            <p className="mt-2 text-sm text-muted-foreground">Use a private 4 to 6 digit number.</p>
          </section>
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex gap-3 text-sm text-muted-foreground">
              <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <p>After five incorrect attempts, MPIN verification is locked for 15 minutes.</p>
            </div>
          </section>
        </aside>
        <section className="rounded-lg border border-primary/30 bg-card p-5">
          <h2 className="border-b border-border pb-4 text-lg font-semibold">Update MPIN</h2>
          <div className="mt-5"><SecurityPinChangeForm /></div>
        </section>
      </div>
    </main>
  );
}
