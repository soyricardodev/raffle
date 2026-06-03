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
import type { ChartConfig } from "@/components/evilcharts/ui/chart"

type Row = { label: string; count: number; revenue?: number }

const chartConfig = {
  count: {
    label: "Ventas",
    colors: { light: ["var(--color-chart-2)"], dark: ["var(--color-chart-2)"] },
  },
} satisfies ChartConfig

export function CountBarChart({
  data,
  isLoading = false,
  dataKey = "count",
  labelKey = "label",
  emptyMessage = "Sin datos en el período.",
}: {
  data: Row[]
  isLoading?: boolean
  dataKey?: string
  labelKey?: string
  emptyMessage?: string
}) {
  if (!data.length && !isLoading) {
    return <p className="text-muted-foreground py-8 text-center text-sm">{emptyMessage}</p>
  }

  return (
    <EvilBarChart
      data={data}
      config={chartConfig}
      isLoading={isLoading}
      className="h-full min-h-[220px] w-full p-2 md:min-h-[260px]"
    >
      <Grid />
      <XAxis dataKey={labelKey} />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey={dataKey} variant="gradient" />
    </EvilBarChart>
  )
}
