"use client"

import {
  EvilPieChart,
  Legend,
  Pie,
  Tooltip,
} from "@/components/evilcharts/charts/pie-chart"
import { type ChartConfig } from "@/components/evilcharts/ui/chart"

type Row = { status: string; count: number }

const labels: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
}

const chartConfig = {
  Pendiente: {
    label: "Pendiente",
    colors: { light: ["var(--color-chart-4)"], dark: ["var(--color-chart-4)"] },
  },
  Aprobado: {
    label: "Aprobado",
    colors: { light: ["var(--color-chart-1)"], dark: ["var(--color-chart-1)"] },
  },
  Rechazado: {
    label: "Rechazado",
    colors: { light: ["var(--color-chart-5)"], dark: ["var(--color-chart-5)"] },
  },
} satisfies ChartConfig

export function StatusPieChart({
  data,
  isLoading = false,
}: {
  data: Row[]
  isLoading?: boolean
}) {
  const chartData = data.map((row) => ({
    name: labels[row.status] ?? row.status,
    status: row.status,
    value: row.count,
  }))

  if (!chartData.length && !isLoading) {
    return <p className="text-muted-foreground py-8 text-center text-sm">Sin datos.</p>
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
