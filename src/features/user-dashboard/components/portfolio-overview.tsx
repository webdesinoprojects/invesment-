import { formatUsd } from "@/lib/money/format-money";

import { PortfolioRingChart } from "./portfolio-ring-chart";

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
    { label: "Total investment", value: activeInvestment, color: "#2f81f7", progress: 88 },
    { label: "ROI income", value: dailyRoi, color: "#20c875", progress: 82 },
    { label: "Today business", value: todayBusiness, color: "#ffb72e", progress: 78 },
    { label: "Total business", value: totalBusiness, color: "#13b8d4", progress: 92 },
    { label: "Total income", value: totalIncome, color: "#2f81f7", progress: 86 },
  ];

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Portfolio Overview</h2>
      <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="text-center">
            <PortfolioRingChart
              color={metric.color}
              label={metric.label}
              progress={metric.progress}
            />
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
