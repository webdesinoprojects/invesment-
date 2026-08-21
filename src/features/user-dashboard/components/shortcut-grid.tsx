import {
  BadgeDollarSign,
  ChartNoAxesColumn,
  CircleDollarSign,
  UserRoundSearch,
} from "lucide-react";
import Link from "next/link";

const shortcuts = [
  { href: "/team", label: "Team", icon: UserRoundSearch },
  { href: "/earnings", label: "Earnings", icon: ChartNoAxesColumn },
  // User deposits are currently administered by staff only.
  { href: "/withdraw", label: "Withdraw", icon: CircleDollarSign },
  { href: "/earnings?tab=rank", label: "Rewards", icon: BadgeDollarSign },
] as const;

export function ShortcutGrid() {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {shortcuts.map((shortcut) => {
        const Icon = shortcut.icon;
        return (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium transition-colors hover:border-primary/50 hover:bg-accent"
          >
            <Icon className="size-5 text-primary" aria-hidden="true" />
            {shortcut.label}
          </Link>
        );
      })}
    </section>
  );
}
