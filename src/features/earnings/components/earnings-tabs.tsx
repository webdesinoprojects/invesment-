import { ChartNoAxesColumn, Network, Trophy, UserRoundCheck } from "lucide-react";
import Link from "next/link";

import type { EarningsTab } from "@/features/earnings/types/earnings";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "roi", label: "Daily ROI", icon: ChartNoAxesColumn },
  { value: "referral", label: "Referral", icon: UserRoundCheck },
  { value: "level", label: "Level income", icon: Network },
  { value: "rank", label: "Rank rewards", icon: Trophy },
] as const;

export function EarningsTabs({ activeTab }: { activeTab: EarningsTab }) {
  return (
    <nav aria-label="Earnings views" className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.value === activeTab;
        return (
          <Link
            key={tab.value}
            href={`/earnings?tab=${tab.value}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
