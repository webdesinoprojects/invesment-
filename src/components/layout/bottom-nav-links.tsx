"use client";

import { ChartNoAxesColumn, History, House, UserRound, WalletCards } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/history", label: "History", icon: History },
  { href: "/assets", label: "Assets", icon: WalletCards },
  { href: "/earnings", label: "Earnings", icon: ChartNoAxesColumn },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

export function BottomNavLinks() {
  const pathname = usePathname();

  return (
    <div className="grid h-full flex-1 grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 text-[0.68rem] text-muted-foreground transition-colors",
              active && "text-primary",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
