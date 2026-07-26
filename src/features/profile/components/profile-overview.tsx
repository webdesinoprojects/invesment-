import { KeyRound, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { countries } from "@/features/auth/constants/countries";
import { WalletAddressForm } from "@/features/profile/components/wallet-address-form";
import type { ProfileData } from "@/features/profile/types/profile";

function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProfileOverview({ profile }: { profile: ProfileData }) {
  const country = countries.find((item) => item.code === profile.countryCode)?.name
    ?? profile.countryCode;

  return (
    <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="space-y-4">
        <section className="rounded-lg border border-primary/30 bg-card p-5 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full border-2 border-primary bg-primary/15 text-xl font-semibold text-primary">
            {initials(profile.fullName)}
          </div>
          <h2 className="mt-3 text-lg font-semibold">{profile.fullName}</h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">ID: {profile.memberId}</p>
        </section>
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            <h2 className="font-semibold">Security settings</h2>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link href="/security/password">
                <KeyRound className="text-primary" aria-hidden="true" />
                Password
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link href="/security/mpin">
                <LockKeyhole className="text-amber-400" aria-hidden="true" />
                Change MPIN
              </Link>
            </Button>
          </div>
        </section>
      </aside>

      <section className="rounded-lg border border-primary/30 bg-card p-5">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <UserRound className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Personal information</h2>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Sponsor ID" value={profile.sponsorMemberId} />
          <ReadOnlyField label="Sponsor name" value={profile.sponsorName} />
          <ReadOnlyField label="Full name" value={profile.fullName} className="sm:col-span-2" />
          <ReadOnlyField label="Email address" value={profile.email} className="sm:col-span-2" />
          <ReadOnlyField label="Mobile number" value={profile.mobile} />
          <ReadOnlyField label="Country" value={country} />
        </div>
        <div className="mt-5 border-t border-border pt-5">
          <WalletAddressForm key={profile.walletAddress} walletAddress={profile.walletAddress} />
        </div>
      </section>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      <Input value={value} readOnly className="h-11 text-muted-foreground" />
    </div>
  );
}
