import { Link2 } from "lucide-react";

import { CopyReferralLink } from "@/features/referral/components/copy-referral-link";

export function TeamReferralCard({
  referralUrl,
  isActive,
}: {
  referralUrl: string;
  isActive: boolean;
}) {
  return (
    <section id="refer" className="rounded-lg border border-border bg-card p-5 scroll-mt-20">
      <div className="flex items-start gap-3">
        <Link2 className="mt-0.5 size-5 text-primary" aria-hidden="true" />
        <div>
          <h2 className="font-semibold">Refer and earn</h2>
          <p className="text-sm text-muted-foreground">
            {isActive ? "Your referral link is active." : "Activates after an approved investment."}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={referralUrl}
          readOnly
          aria-label="Your referral link"
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 font-mono text-xs text-muted-foreground"
        />
        <CopyReferralLink url={referralUrl} isActive={isActive} />
      </div>
    </section>
  );
}
