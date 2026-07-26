import { BadgeDollarSign, CalendarRange, Percent, WalletCards } from "lucide-react";

import { ActivationForm } from "@/features/investment/components/activation-form";
import { formatUsd } from "@/lib/money/format-money";

export function InvestmentPanel({
  availableBalance,
  minimumAmount,
  monthlyRoiPercent,
  durationMonths,
  memberId,
  memberName,
  requestToken,
}: {
  availableBalance: string;
  minimumAmount: string | null;
  monthlyRoiPercent: string | null;
  durationMonths: number | null;
  memberId: string;
  memberName: string;
  requestToken: string;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
      <div className="space-y-5">
        <section className="rounded-lg border border-border bg-card p-5">
          <WalletCards className="size-6 text-primary" aria-hidden="true" />
          <p className="mt-5 text-xs font-medium uppercase text-muted-foreground">Available balance</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{formatUsd(availableBalance)}</p>
        </section>
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <Percent className="size-5 text-emerald-400" aria-hidden="true" />
            <p className="mt-3 text-xs text-muted-foreground">Monthly ROI</p>
            <p className="font-semibold">{monthlyRoiPercent ?? "-"}%</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <CalendarRange className="size-5 text-amber-400" aria-hidden="true" />
            <p className="mt-3 text-xs text-muted-foreground">Duration</p>
            <p className="font-semibold">{durationMonths ?? "-"} months</p>
          </div>
        </section>
      </div>
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <BadgeDollarSign className="mt-0.5 size-5 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Wallet activation</h2>
            <p className="text-sm text-muted-foreground">Activate your account or fund another registered member.</p>
          </div>
        </div>
        <div className="mt-5">
          {minimumAmount ? (
            <ActivationForm
              defaultMemberId={memberId}
              defaultMemberName={memberName}
              minimumAmount={minimumAmount}
              requestToken={requestToken}
            />
          ) : (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              Investment settings are unavailable.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
