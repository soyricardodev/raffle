import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type Row = { method: string; revenue: number; count: number }

export function MethodRevenueChart({ data }: { data: Row[] }) {
  const chartData = data.map((row) => ({
    ...row,
    label: row.method.replace(/_/g, " "),
  }))

  if (!chartData.length) {
    return <p className="text-muted-foreground py-8 text-center text-sm">Sin datos.</p>
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={220} className="min-h-[220px] md:min-h-[260px]">
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="revenue" name="Ingresos" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
