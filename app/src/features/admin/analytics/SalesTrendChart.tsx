"use client"

import {
  EvilLineChart,
  Grid,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/evilcharts/charts/line-chart"
import { type ChartConfig } from "@/components/evilcharts/ui/chart"

type Point = { date: string; count: number; revenue: number }

const chartConfig = {
  count: {
    label: "Ventas",
    colors: { light: ["var(--color-chart-1)"], dark: ["var(--color-chart-1)"] },
  },
} satisfies ChartConfig

export function SalesTrendChart({
  data,
  isLoading = false,
}: {
  data: Point[]
  isLoading?: boolean
}) {
  if (!data.length && !isLoading) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">Sin datos en el período.</p>
    )
  }

  return (
    <EvilLineChart
      data={data}
      config={chartConfig}
      isLoading={isLoading}
      className="h-full min-h-[220px] w-full p-2 md:min-h-[280px]"
    >
      <Grid />
      <XAxis
        dataKey="date"
        tickFormatter={(value: string) =>
          value.length >= 10 ? value.slice(5, 10) : value
        }
      />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line dataKey="count" glowing />
    </EvilLineChart>
  )
}
