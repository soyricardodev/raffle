import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts"

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

type Row = { status: string; count: number }

const labels: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
}

export function StatusPieChart({ data }: { data: Row[] }) {
  const chartData = data.map((row) => ({
    name: labels[row.status] ?? row.status,
    value: row.count,
  }))

  if (!chartData.length) {
    return <p className="text-muted-foreground py-8 text-center text-sm">Sin datos.</p>
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={220} className="min-h-[220px] md:min-h-[260px]">
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="70%"
          label={({ name, percent }) =>
            percent && percent > 0.05 ? `${name}` : ""
          }
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
