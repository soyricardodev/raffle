import { useQuery } from "@tanstack/react-query"
import { AlertCircle, RefreshCw } from "lucide-react"
import { useMemo, useState } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnalyticsExploreTab, FunnelList } from "@/features/admin/analytics/AnalyticsExploreTab"
import { AnalyticsPeriodFilter } from "@/features/admin/analytics/AnalyticsPeriodFilter"
import {
  ComparisonCards,
  RaffleVelocityTable,
  RepeatCustomersCard,
} from "@/features/admin/analytics/AnalyticsSummaryCards"
import { CountBarChart } from "@/features/admin/analytics/CountBarChart"
import { LabelPieChart } from "@/features/admin/analytics/LabelPieChart"
import { MethodRevenueChart } from "@/features/admin/analytics/MethodRevenueChart"
import { SalesTrendChart } from "@/features/admin/analytics/SalesTrendChart"
import { StatusPieChart } from "@/features/admin/analytics/StatusPieChart"
import { TopRafflesList } from "@/features/admin/analytics/TopRafflesList"
import {
  exportAnalyticsCsv,
  periodLabel,
  periodToSearchParams,
  type AnalyticsPeriodState,
  type AnalyticsResponse,
} from "@/features/admin/analytics/types"
import { raffleStatusLabel } from "@/features/admin/raffle-labels"
import { adminNavTitle } from "@/features/admin/nav"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { adminFetch } from "@/lib/admin-fetch"
import { formatCurrency } from "@/lib/format"

const POLL_MS = 60_000

export function AdminAnalytics() {
  const [period, setPeriod] = useState<AnalyticsPeriodState>({ kind: "preset", days: 30 })
  const [raffleId, setRaffleId] = useState("")

  const analyticsQuery = useQuery({
    queryKey: ["admin", "analytics", period, raffleId],
    queryFn: () => {
      const params = periodToSearchParams(period, raffleId)
      return adminFetch<AnalyticsResponse>(`/api/admin/analytics?${params}`)
    },
    refetchInterval: POLL_MS,
  })

  const data = analyticsQuery.data
  const raffles = data?.filterRaffles ?? []

  const summaryCards = useMemo(
    () => [
      { label: "Ingresos (aprobados)", value: formatCurrency(data?.totalRevenue ?? 0) },
      { label: "Ventas en período", value: data?.summary.totalSales ?? 0 },
      {
        label: "Tasa aprobación",
        value: `${((data?.summary.approvalRate ?? 0) * 100).toFixed(1)}%`,
      },
      { label: "Clientes únicos", value: data?.summary.uniqueCustomers ?? 0 },
      {
        label: "Boletos / compra",
        value: (data?.summary.avgTicketsPerPurchase ?? 0).toFixed(1),
      },
      { label: "Promedio ventas/día", value: (data?.dailyAverage ?? 0).toFixed(1) },
    ],
    [data],
  )

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={adminNavTitle("/admin/analytics")}
        description="Tendencias, geografía, comportamiento y exploración de compras"
        actions={
          <div className="flex w-full flex-col gap-3 lg:w-auto">
            <Select value={raffleId || "all"} onValueChange={(v) => setRaffleId(v === "all" ? "" : v)}>
              <SelectTrigger className="h-11 w-full lg:w-[240px]" aria-label="Filtrar por rifa">
                <SelectValue placeholder="Rifa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las rifas</SelectItem>
                {raffles.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name} ({raffleStatusLabel(r.status)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AnalyticsPeriodFilter
              value={period}
              onChange={setPeriod}
              onExport={data ? () => exportAnalyticsCsv(data, periodLabel(period)) : undefined}
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

      {data?.periodComparison ? <ComparisonCards comparison={data.periodComparison} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {analyticsQuery.isLoading && !data
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
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

      <Tabs defaultValue="resumen">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="geografia">Geografía</TabsTrigger>
          <TabsTrigger value="comportamiento">Comportamiento</TabsTrigger>
          <TabsTrigger value="rifas">Rifas</TabsTrigger>
          <TabsTrigger value="explorar">Explorar</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ventas por día</CardTitle>
            </CardHeader>
            <CardContent className="h-[240px] md:h-[300px]">
              <SalesTrendChart data={data?.salesOverTime ?? []} isLoading={analyticsQuery.isLoading} />
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
              <CardTitle className="text-base">Estado de compra</CardTitle>
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
              <CardTitle className="text-base">Moneda (VES / USD)</CardTitle>
            </CardHeader>
            <CardContent className="h-[240px] md:h-[300px]">
              <LabelPieChart
                data={(data?.currencySplit ?? []).map((r) => ({
                  label: r.currency,
                  count: r.count,
                }))}
                isLoading={analyticsQuery.isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geografia" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ventas por estado (Venezuela)</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px] md:h-[360px]">
              <CountBarChart
                data={(data?.locationByState ?? []).slice(0, 12).map((r) => ({
                  label: r.label,
                  count: r.count,
                }))}
                isLoading={analyticsQuery.isLoading}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mix geográfico</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px] md:h-[360px]">
              <LabelPieChart
                data={(data?.locationMix ?? []).map((r) => ({ label: r.label, count: r.count }))}
                isLoading={analyticsQuery.isLoading}
              />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Detalle por ubicación</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="pb-2 font-medium">Ubicación</th>
                    <th className="pb-2 font-medium">Ventas</th>
                    <th className="pb-2 font-medium">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.locationByState ?? []).map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2 font-medium">{row.label}</td>
                      <td className="py-2 tabular-nums">{row.count}</td>
                      <td className="py-2 tabular-nums">{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comportamiento" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ventas por día de la semana</CardTitle>
            </CardHeader>
            <CardContent className="h-[240px] md:h-[300px]">
              <CountBarChart
                data={(data?.salesByWeekday ?? []).map((r) => ({
                  label: r.weekday,
                  count: r.count,
                }))}
                isLoading={analyticsQuery.isLoading}
                labelKey="label"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ventas por hora</CardTitle>
            </CardHeader>
            <CardContent className="h-[240px] md:h-[300px]">
              <CountBarChart
                data={(data?.salesByHour ?? []).map((r) => ({ label: r.hour, count: r.count }))}
                isLoading={analyticsQuery.isLoading}
              />
            </CardContent>
          </Card>
          <RepeatCustomersCard stats={data?.repeatCustomers ?? {
            uniqueCustomers: 0,
            repeatBuyers: 0,
            repeatPurchases: 0,
            repeatBuyerRate: 0,
          }} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Impacto de promociones</CardTitle>
            </CardHeader>
            <CardContent className="h-[240px] md:h-[280px]">
              <CountBarChart
                data={(data?.promotionImpact ?? []).map((r) => ({
                  label: r.label,
                  count: r.count,
                }))}
                isLoading={analyticsQuery.isLoading}
              />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Embudo post-compra</CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelList events={data?.purchaseSuccessFunnel ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rifas" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top rifas por ingresos</CardTitle>
            </CardHeader>
            <CardContent>
              <TopRafflesList raffles={data?.topRaffles ?? []} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Velocidad de venta</CardTitle>
            </CardHeader>
            <CardContent>
              <RaffleVelocityTable rows={data?.raffleVelocity ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="explorar" className="mt-4">
          <AnalyticsExploreTab period={period} raffleId={raffleId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
