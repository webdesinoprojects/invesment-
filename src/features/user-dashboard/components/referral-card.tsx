import { formatUsd } from "@/lib/money/format-money";

import { CopyReferralLink } from "./copy-referral-link";

export function ReferralCard({
  directTeamCount,
  totalDownlineCount,
  directIncome,
  levelIncome,
  rankRewards,
  referralUrl,
  isReferralActive,
}: {
  directTeamCount: number;
  totalDownlineCount: number;
  directIncome: string;
  levelIncome: string;
  rankRewards: string;
  referralUrl: string;
  isReferralActive: boolean;
}) {
  const metrics = [
    { label: "Direct team", value: String(directTeamCount) },
    { label: "Total downline", value: String(totalDownlineCount) },
    { label: "Level income", value: formatUsd(levelIncome) },
    { label: "Direct income", value: formatUsd(directIncome) },
    { label: "Rewards", value: formatUsd(rankRewards) },
  ];

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Referral program</h2>
        <span className="text-xs text-muted-foreground">
          {isReferralActive ? "Active" : "Activates after investment"}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-1 truncate font-semibold tabular-nums">{metric.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input
          value={referralUrl}
          readOnly
          aria-label="Your referral link"
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 font-mono text-xs text-muted-foreground outline-none"
        />
        <CopyReferralLink url={referralUrl} isActive={isReferralActive} />
      </div>
    </section>
  );
}
