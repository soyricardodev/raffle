import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { adminFetch } from "@/lib/admin-fetch"
import { formatCurrency } from "@/lib/format"
import { MethodRevenueChart } from "@/features/admin/analytics/MethodRevenueChart"
import { SalesTrendChart } from "@/features/admin/analytics/SalesTrendChart"
import { StatusPieChart } from "@/features/admin/analytics/StatusPieChart"
import { TopRafflesList } from "@/features/admin/analytics/TopRafflesList"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Download, RefreshCw } from "lucide-react"

type AnalyticsResponse = {
  salesOverTime: { date: string; count: number; revenue: number }[]
  topRaffles: {
    id: number
    name: string
    totalSales: number
    totalRevenue: number
    ticketCount: number
  }[]
  revenueByMethod: { method: string; count: number; revenue: number }[]
  statusDistribution: { status: string; count: number }[]
  dailyAverage: number
  totalRevenue: number
}

const PERIODS = [
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
] as const

function exportCsv(data: AnalyticsResponse, days: number) {
  const lines = [
    `Período,${days} días`,
    `Ingresos totales,${data.totalRevenue}`,
    `Promedio ventas/día,${data.dailyAverage.toFixed(2)}`,
    "",
    "Fecha,Ventas,Ingresos",
    ...data.salesOverTime.map((row) => `${row.date},${row.count},${row.revenue}`),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `analytics-${days}d.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function AdminAnalytics() {
  const [days, setDays] = useState(30)

  const analyticsQuery = useQuery({
    queryKey: ["admin", "analytics", days],
    queryFn: () => adminFetch<AnalyticsResponse>(`/api/admin/analytics?days=${days}`),
  })

  const data = analyticsQuery.data

  const summaryCards = useMemo(
    () => [
      { label: "Ingresos (aprobados)", value: formatCurrency(data?.totalRevenue ?? 0) },
      { label: "Promedio ventas/día", value: (data?.dailyAverage ?? 0).toFixed(1) },
      {
        label: "Ventas en período",
        value: data?.salesOverTime.reduce((sum, row) => sum + row.count, 0) ?? 0,
      },
    ],
    [data],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Análisis</h1>
          <p className="text-muted-foreground text-sm">Tendencias y desempeño comercial</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((period) => (
            <Button
              key={period.days}
              size="sm"
              variant={days === period.days ? "default" : "outline"}
              onClick={() => setDays(period.days)}
            >
              {period.label}
            </Button>
          ))}
          {data && (
            <Button size="sm" variant="outline" onClick={() => exportCsv(data, days)}>
              <Download className="mr-2 size-4" />
              CSV
            </Button>
          )}
        </div>
      </div>

      {analyticsQuery.isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center sm:flex-row sm:text-left">
            <AlertCircle className="text-destructive size-8 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">No se pudieron cargar los datos</p>
              <p className="text-muted-foreground text-sm">Revisa tu conexión e intenta de nuevo.</p>
            </div>
            <Button variant="outline" className="min-h-11" onClick={() => void analyticsQuery.refetch()}>
              <RefreshCw className="mr-2 size-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {analyticsQuery.isLoading && !data
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : summaryCards.map((card) => (
              <Card key={card.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    {card.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">{card.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventas e ingresos en el tiempo</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] md:h-[300px]">
            <SalesTrendChart data={data?.salesOverTime ?? []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos por método de pago</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] md:h-[300px]">
            <MethodRevenueChart data={data?.revenueByMethod ?? []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por estado</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] md:h-[300px]">
            <StatusPieChart data={data?.statusDistribution ?? []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top rifas por ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <TopRafflesList raffles={data?.topRaffles ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
