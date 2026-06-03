"use client"

import { EvilPieChart, Legend, Pie, Tooltip } from "@/components/evilcharts/charts/pie-chart"
import type { ChartConfig } from "@/components/evilcharts/ui/chart"

type Row = { label: string; count: number }

const chartConfig = {
  value: {
    label: "Cantidad",
    colors: {
      light: [
        "var(--color-chart-1)",
        "var(--color-chart-2)",
        "var(--color-chart-3)",
        "var(--color-chart-4)",
        "var(--color-chart-5)",
      ],
      dark: [
        "var(--color-chart-1)",
        "var(--color-chart-2)",
        "var(--color-chart-3)",
        "var(--color-chart-4)",
        "var(--color-chart-5)",
      ],
    },
  },
} satisfies ChartConfig

export function LabelPieChart({
  data,
  isLoading = false,
  emptyMessage = "Sin datos.",
}: {
  data: Row[]
  isLoading?: boolean
  emptyMessage?: string
}) {
  const chartData = data.map((row) => ({
    name: row.label,
    value: row.count,
  }))

  if (!chartData.length && !isLoading) {
    return <p className="text-muted-foreground py-8 text-center text-sm">{emptyMessage}</p>
  }

  return (
    <EvilPieChart
      data={chartData}
      config={chartConfig}
      dataKey="value"
      nameKey="name"
      isLoading={isLoading}
      className="h-full min-h-[220px] w-full p-2 md:min-h-[260px]"
    >
      <Tooltip />
      <Legend />
      <Pie variant="gradient" innerRadius="45%" />
    </EvilPieChart>
  )
}
