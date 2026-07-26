import { Network, UserRoundCheck, UsersRound } from "lucide-react";
import Link from "next/link";

import type { TeamTab } from "@/features/team/types/team";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "all", label: "All team", icon: Network },
  { value: "topup", label: "Topup IDs", icon: UserRoundCheck },
  { value: "today", label: "Today topup", icon: UserRoundCheck },
  { value: "direct", label: "Direct", icon: UsersRound },
] as const;

export function TeamTabs({ activeTab }: { activeTab: TeamTab }) {
  return (
    <nav aria-label="Team views" className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.value === activeTab;
        return (
          <Link
            key={tab.value}
            href={`/team?tab=${tab.value}`}
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
