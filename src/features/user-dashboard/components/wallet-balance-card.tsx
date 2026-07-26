import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/money/format-money";

export function WalletBalanceCard({ balance }: { balance: string }) {
  return (
    <section className="flex flex-col gap-5 rounded-lg border border-primary/25 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Wallet balance
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">
          {formatUsd(balance)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:w-72">
        <Button asChild className="h-10 bg-amber-400 text-black hover:bg-amber-300">
          <Link href="/deposit">
            <ArrowDownToLine aria-hidden="true" />
            Deposit
          </Link>
        </Button>
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
