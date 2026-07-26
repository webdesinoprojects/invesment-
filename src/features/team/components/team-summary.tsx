import { Network, UsersRound } from "lucide-react";

const items = [
  { key: "direct", label: "Direct team", icon: UsersRound },
  { key: "downline", label: "Total downline", icon: Network },
] as const;

export function TeamSummary({
  directCount,
  downlineCount,
}: {
  directCount: number;
  downlineCount: number;
}) {
  const values = { direct: directCount, downline: downlineCount };

  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-5" aria-label="Team summary">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.key} className="rounded-lg border border-border bg-card p-4 sm:p-5">
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 text-2xl font-semibold tabular-nums sm:text-3xl">
              {values[item.key]}
            </p>
            <p className="mt-1 text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
          </div>
        );
      })}
    </section>
  );
}
