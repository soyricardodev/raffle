import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AnalyticsResponse } from "@/features/admin/analytics/types"

function DeltaBadge({ value, suffix = "%" }: { value: number | null | undefined; suffix?: string }) {
  if (value == null || Number.isNaN(value)) return null
  const positive = value >= 0
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
        positive
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "bg-rose-500/10 text-rose-700 dark:text-rose-300",
      )}
    >
      {positive ? "+" : ""}
      {value.toFixed(1)}
      {suffix}
    </span>
  )
}

export function ComparisonCards({
  comparison,
}: {
  comparison: AnalyticsResponse["periodComparison"]
}) {
  if (!comparison.previous || !comparison.delta) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-muted-foreground text-sm">
            Comparación vs período anterior no disponible para «todo el historial».
          </p>
        </CardContent>
      </Card>
    )
  }

  const cards = [
    {
      label: "Ingresos",
      value: formatCurrency(comparison.current.totalRevenue),
      delta: comparison.delta.totalRevenuePct,
    },
    {
      label: "Ventas",
      value: String(comparison.current.totalSales),
      delta: comparison.delta.totalSalesPct,
    },
    {
      label: "Clientes únicos",
      value: String(comparison.current.uniqueCustomers),
      delta: comparison.delta.uniqueCustomersPct,
    },
    {
      label: "Tasa aprobación",
      value: `${(comparison.current.approvalRate * 100).toFixed(1)}%`,
      delta: comparison.delta.approvalRatePts,
      suffix: " pp",
    },
    {
      label: "Boletos / compra",
      value: comparison.current.avgTicketsPerPurchase.toFixed(1),
      delta: comparison.delta.avgTicketsPct,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2">
            <p className="text-xl font-semibold tabular-nums">{card.value}</p>
            <DeltaBadge value={card.delta} suffix={card.suffix} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function RepeatCustomersCard({
  stats,
}: {
  stats: AnalyticsResponse["repeatCustomers"]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Clientes recurrentes</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Clientes únicos</p>
          <p className="text-2xl font-semibold tabular-nums">{stats.uniqueCustomers}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Compradores repetidos</p>
          <p className="text-2xl font-semibold tabular-nums">{stats.repeatBuyers}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Compras de repetidos</p>
          <p className="text-xl font-semibold tabular-nums">{stats.repeatPurchases}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Tasa recurrencia</p>
          <p className="text-xl font-semibold tabular-nums">
            {(stats.repeatBuyerRate * 100).toFixed(1)}%
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function RaffleVelocityTable({
  rows,
}: {
  rows: AnalyticsResponse["raffleVelocity"]
}) {
  if (!rows.length) {
    return <p className="text-muted-foreground text-sm">Sin rifas con actividad en el período.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-xs">
            <th className="pb-2 pr-3 font-medium">Rifa</th>
            <th className="pb-2 pr-3 font-medium">Ventas</th>
            <th className="pb-2 pr-3 font-medium">Boletos</th>
            <th className="pb-2 pr-3 font-medium">Ingresos</th>
            <th className="pb-2 pr-3 font-medium">Días activos</th>
            <th className="pb-2 font-medium">Boletos/día</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="py-2 pr-3 font-medium">{row.name}</td>
              <td className="py-2 pr-3 tabular-nums">{row.sales}</td>
              <td className="py-2 pr-3 tabular-nums">{row.tickets}</td>
              <td className="py-2 pr-3 tabular-nums">{formatCurrency(row.revenue)}</td>
              <td className="py-2 pr-3 tabular-nums">{row.activeDays}</td>
              <td className="py-2 tabular-nums">{row.ticketsPerDay.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
