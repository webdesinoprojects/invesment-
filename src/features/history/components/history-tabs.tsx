import { ArrowDownToLine, ArrowUpFromLine, WalletCards } from "lucide-react";
import Link from "next/link";

import type { HistoryTab } from "@/features/history/types/history";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "main", label: "Main wallet", icon: WalletCards },
  { value: "withdraw", label: "Withdraw history", icon: ArrowUpFromLine },
  { value: "deposit", label: "Deposit history", icon: ArrowDownToLine },
] as const;

export function HistoryTabs({ activeTab }: { activeTab: HistoryTab }) {
  return (
    <nav aria-label="Wallet history views" className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.value === activeTab;
        return (
          <Link
            key={tab.value}
            href={`/history?tab=${tab.value}`}
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
