import { CircleDollarSign } from "lucide-react";

import { formatUsd } from "@/lib/money/format-money";

export function EarningsTotal({ amount }: { amount: string }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 text-center">
      <CircleDollarSign className="mx-auto size-5 text-primary" aria-hidden="true" />
      <p className="mt-3 text-xs font-medium uppercase text-muted-foreground">Total income earned</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{formatUsd(amount)}</p>
    </section>
  );
}
