"use client"

import {
  Bar,
  EvilBarChart,
  Grid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/evilcharts/charts/bar-chart"
import { type ChartConfig } from "@/components/evilcharts/ui/chart"

type Row = { method: string; revenue: number; count: number }

const chartConfig = {
  revenue: {
    label: "Ingresos",
    colors: { light: ["var(--color-chart-3)"], dark: ["var(--color-chart-3)"] },
  },
} satisfies ChartConfig

export function MethodRevenueChart({
  data,
  isLoading = false,
}: {
  data: Row[]
  isLoading?: boolean
}) {
  const chartData = data.map((row) => ({
    ...row,
    label: row.method.replace(/_/g, " "),
  }))

  if (!chartData.length && !isLoading) {
    return <p className="text-muted-foreground py-8 text-center text-sm">Sin datos.</p>
  }

  return (
    <EvilBarChart
      data={chartData}
      config={chartConfig}
      isLoading={isLoading}
      className="h-full min-h-[220px] w-full p-2 md:min-h-[260px]"
    >
      <Grid />
      <XAxis dataKey="label" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="revenue" variant="gradient" />
    </EvilBarChart>
  )
}
