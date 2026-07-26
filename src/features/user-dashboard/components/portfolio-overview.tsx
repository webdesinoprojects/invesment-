import { formatUsd } from "@/lib/money/format-money";

export function PortfolioOverview({
  activeInvestment,
  dailyRoi,
  todayBusiness,
  totalBusiness,
  totalIncome,
}: {
  activeInvestment: string;
  dailyRoi: string;
  todayBusiness: string;
  totalBusiness: string;
  totalIncome: string;
}) {
  const metrics = [
    { label: "Active investment", value: activeInvestment, color: "border-blue-500" },
    { label: "ROI income", value: dailyRoi, color: "border-emerald-500" },
    { label: "Today business", value: todayBusiness, color: "border-amber-400" },
    { label: "Total business", value: totalBusiness, color: "border-cyan-400" },
    { label: "Total income", value: totalIncome, color: "border-primary" },
  ];

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Portfolio overview</h2>
      <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="text-center">
            <div
              className={`mx-auto grid size-16 place-items-center rounded-full border-4 ${metric.color}`}
            >
              <span className="size-2 rounded-full bg-foreground/70" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatUsd(metric.value)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
