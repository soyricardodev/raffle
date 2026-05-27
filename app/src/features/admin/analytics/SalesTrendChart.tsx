import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Point = { date: string; count: number; revenue: number }

export function SalesTrendChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return <p className="text-muted-foreground py-8 text-center text-sm">Sin datos en el período.</p>
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={220} className="min-h-[220px] md:min-h-[280px]">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="count"
          name="Ventas"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="revenue"
          name="Ingresos"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
