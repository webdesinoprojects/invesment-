import { CalendarClock, WalletCards } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { WithdrawalRequestForm } from "@/features/wallet/components/withdrawal-request-form";
import { formatUsd } from "@/lib/money/format-money";

export function WithdrawalPanel({
  availableBalance,
  walletAddress,
  minimumAmount,
  isOpen,
  requestToken,
}: {
  availableBalance: string;
  walletAddress: string | null;
  minimumAmount: string | null;
  isOpen: boolean;
  requestToken: string;
}) {
  const unavailableMessage = !minimumAmount
    ? "Withdrawal settings are unavailable."
    : !isOpen
      ? "The withdrawal window is currently closed."
      : "Add your BEP-20 wallet address before requesting a withdrawal.";

  return (
    <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
      <section className="rounded-lg border border-border bg-card p-5">
        <WalletCards className="size-6 text-primary" aria-hidden="true" />
        <p className="mt-5 text-xs font-medium uppercase text-muted-foreground">Available balance</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatUsd(availableBalance)}</p>
        <p className="mt-4 flex gap-2 text-xs text-muted-foreground">
          <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
          Held funds are unavailable until admin approval or rejection.
        </p>
      </section>
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold">Transfer request</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Requests are reviewed and paid manually by an administrator.
        </p>
        {isOpen && walletAddress && minimumAmount ? (
          <WithdrawalRequestForm
            walletAddress={walletAddress}
            minimumAmount={minimumAmount}
            requestToken={requestToken}
          />
        ) : (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            <p>{unavailableMessage}</p>
            {isOpen && !walletAddress ? (
              <Button asChild variant="outline" className="mt-3">
                <Link href="/profile">Open profile</Link>
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
