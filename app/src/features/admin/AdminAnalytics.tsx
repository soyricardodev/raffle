import { useQuery } from "@tanstack/react-query"
import { AlertCircle, RefreshCw } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { MethodRevenueChart } from "@/features/admin/analytics/MethodRevenueChart"
import { PeriodFilter } from "@/features/admin/analytics/PeriodFilter"
import { SalesTrendChart } from "@/features/admin/analytics/SalesTrendChart"
import { StatusPieChart } from "@/features/admin/analytics/StatusPieChart"
import { TopRafflesList } from "@/features/admin/analytics/TopRafflesList"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { adminFetch } from "@/lib/admin-fetch"
import { formatCurrency } from "@/lib/format"

const POLL_MS = 60_000

type AnalyticsResponse = {
  salesOverTime: Array<{ date: string; count: number; revenue: number }>
  topRaffles: Array<{
    id: number
    name: string
    totalSales: number
    totalRevenue: number
    ticketCount: number
  }>
  revenueByMethod: Array<{ method: string; count: number; revenue: number }>
  statusDistribution: Array<{ status: string; count: number }>
  dailyAverage: number
  totalRevenue: number
}

type DashboardStats = {
  active_raffles: Array<{ id: number; name: string }>
}

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
  const [raffleId, setRaffleId] = useState("")
  const [raffleInitialized, setRaffleInitialized] = useState(false)

  const rafflesQuery = useQuery({
    queryKey: ["admin", "dashboard", "raffles-list"],
    queryFn: () => adminFetch<DashboardStats>("/api/admin/dashboard"),
    staleTime: 60_000,
  })

  const activeRaffles = rafflesQuery.data?.active_raffles ?? []

  useEffect(() => {
    if (raffleInitialized || !activeRaffles.length) return
    setRaffleId(String(activeRaffles[0]!.id))
    setRaffleInitialized(true)
  }, [activeRaffles, raffleInitialized])

  const analyticsQuery = useQuery({
    queryKey: ["admin", "analytics", days, raffleId],
    queryFn: () => {
      const params = new URLSearchParams({ days: String(days) })
      if (raffleId) params.set("raffleId", raffleId)
      return adminFetch<AnalyticsResponse>(`/api/admin/analytics?${params}`)
    },
    refetchInterval: POLL_MS,
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
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Análisis"
        description="Tendencias y desempeño comercial"
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={raffleId || "all"}
              onValueChange={(v) => setRaffleId(v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-11 w-full sm:w-[200px]" aria-label="Filtrar por rifa">
                <SelectValue placeholder="Rifa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las rifas</SelectItem>
                {activeRaffles.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PeriodFilter
              value={days}
              onChange={setDays}
              onExport={data ? () => exportCsv(data, days) : undefined}
              exportDisabled={!data}
            />
          </div>
        }
      />

      {analyticsQuery.isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center sm:flex-row sm:text-left">
            <AlertCircle className="text-destructive size-8 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">No se pudieron cargar los datos</p>
              <p className="text-muted-foreground text-sm">
                Revisa tu conexión e intenta de nuevo.
              </p>
            </div>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => void analyticsQuery.refetch()}
            >
              <RefreshCw className="mr-2 size-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {analyticsQuery.isLoading && !data
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
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
            <CardTitle className="text-base">Ventas por día</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] md:h-[300px]">
            <SalesTrendChart
              data={data?.salesOverTime ?? []}
              isLoading={analyticsQuery.isLoading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos por método de pago</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] md:h-[300px]">
            <MethodRevenueChart
              data={data?.revenueByMethod ?? []}
              isLoading={analyticsQuery.isLoading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por estado</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] md:h-[300px]">
            <StatusPieChart
              data={data?.statusDistribution ?? []}
              isLoading={analyticsQuery.isLoading}
            />
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
