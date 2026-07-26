import {
  BadgeDollarSign,
  ChartNoAxesColumn,
  CircleDollarSign,
  HandCoins,
  Landmark,
  Network,
  Trophy,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { AssetsData } from "@/features/assets/types/assets";
import { formatUsd } from "@/lib/money/format-money";

const metrics = [
  { key: "activeInvestment", label: "Active investment", icon: Landmark, color: "text-amber-400" },
  { key: "dailyRoi", label: "Daily ROI", icon: ChartNoAxesColumn, color: "text-emerald-400" },
  { key: "directIncome", label: "Direct income", icon: HandCoins, color: "text-fuchsia-400" },
  { key: "levelIncome", label: "Level income", icon: Network, color: "text-cyan-400" },
  { key: "rankIncome", label: "Rank income", icon: Trophy, color: "text-amber-400" },
  { key: "salaryIncome", label: "Salary income", icon: BadgeDollarSign, color: "text-emerald-400" },
  { key: "totalWithdrawn", label: "Total withdrawn", icon: CircleDollarSign, color: "text-cyan-400" },
] as const satisfies ReadonlyArray<{
  key: Exclude<keyof AssetsData, "walletBalance">;
  label: string;
  icon: typeof Landmark;
  color: string;
}>;

export function AssetsOverview({ data }: { data: AssetsData }) {
  return (
    <>
      <section className="rounded-lg border border-primary/30 bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Main wallet balance</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{formatUsd(data.walletBalance)}</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10">
            <WalletCards className="size-5 text-primary" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/history">View history</Link>
          </Button>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Asset totals">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.key} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                <Icon className={`size-5 ${metric.color}`} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase text-muted-foreground">{metric.label}</p>
                <p className="mt-1 font-semibold tabular-nums">{formatUsd(data[metric.key])}</p>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
