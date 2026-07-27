"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";

type PortfolioRingChartProps = {
  color: string;
  label: string;
  progress: number;
};

export function PortfolioRingChart({
  color,
  label,
  progress,
}: PortfolioRingChartProps) {
  const config = {
    progress: { color, label },
    track: { color: "oklch(0.22 0.025 255)" },
  } satisfies ChartConfig;
  const data = [{ progress }];

  return (
    <ChartContainer
      aria-label={`${label} indicator`}
      className="mx-auto aspect-square size-20"
      config={config}
      initialDimension={{ height: 80, width: 80 }}
      role="img"
    >
      <RadialBarChart
        data={data}
        endAngle={-270}
        innerRadius="76%"
        outerRadius="100%"
        startAngle={90}
      >
        <PolarAngleAxis
          axisLine={false}
          dataKey="progress"
          domain={[0, 100]}
          tick={false}
          type="number"
        />
        <RadialBar
          background={{ fill: "var(--color-track)" }}
          cornerRadius={999}
          dataKey="progress"
          fill="var(--color-progress)"
          isAnimationActive="auto"
        />
      </RadialBarChart>
    </ChartContainer>
  );
}
