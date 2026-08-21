import { ArrowUpFromLine } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/money/format-money";

export function WalletBalanceCard({
  investment,
  earnings,
}: {
  investment: string;
  earnings: string;
}) {
  return (
    <section className="flex flex-col gap-5 rounded-lg border border-primary/25 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Total active investment
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">
          {formatUsd(investment)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Available earnings: <strong className="text-foreground">{formatUsd(earnings)}</strong>
        </p>
      </div>
      <div className="sm:w-36">
        {/* User deposits are currently administered by staff only. */}
        <Button asChild variant="secondary" className="h-10">
          <Link href="/withdraw">
            <ArrowUpFromLine aria-hidden="true" />
            Withdraw
          </Link>
        </Button>
      </div>
    </section>
  );
}
