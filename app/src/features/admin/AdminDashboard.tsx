import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, RefreshCw } from "lucide-react"
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
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { adminFetch } from "@/lib/admin-fetch"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

const POLL_MS = 30_000
const DEFAULT_ANALYTICS_DAYS = 30

type RevenueByMethod = { method: string; count: number; revenue: number }
type ActiveRaffle = { id: number; name: string }

type DashboardStats = {
  raffles: Record<string, number>
  tickets: Record<string, number>
  sales: Record<string, number>
  users: Record<string, number>
  revenue_by_method: Array<RevenueByMethod>
  active_raffles: Array<ActiveRaffle>
  filtered_raffle_id: number | null
}

type AnalyticsResponse = {
  salesOverTime: Array<{ date: string; count: number; revenue: number }>
  revenueByMethod: Array<RevenueByMethod>
  statusDistribution: Array<{ status: string; count: number }>
  dailyAverage: number
  totalRevenue: number
}

function formatLastUpdated(date: Date | null) {
  if (!date) return "—"
  return date.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })
}

export function AdminDashboard() {
  const [raffleId, setRaffleId] = useState<string>("")
  const [days, setDays] = useState(DEFAULT_ANALYTICS_DAYS)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [raffleInitialized, setRaffleInitialized] = useState(false)

  const statsQuery = useQuery({
    queryKey: ["admin", "dashboard", raffleId],
    queryFn: () => {
      const params = raffleId ? `?raffleId=${raffleId}` : ""
      return adminFetch<DashboardStats>(`/api/admin/dashboard${params}`)
    },
    refetchInterval: POLL_MS,
  })

  const analyticsQuery = useQuery({
    queryKey: ["admin", "analytics", days, raffleId],
    queryFn: () => {
      const params = new URLSearchParams({ days: String(days) })
      if (raffleId) params.set("raffleId", raffleId)
      return adminFetch<AnalyticsResponse>(`/api/admin/analytics?${params}`)
    },
    refetchInterval: POLL_MS,
  })

  const stats = statsQuery.data
  const analytics = analyticsQuery.data
  const activeRaffles = stats?.active_raffles ?? []

  useEffect(() => {
    if (raffleInitialized || !activeRaffles.length) return
    setRaffleId(String(activeRaffles[0]!.id))
    setRaffleInitialized(true)
  }, [activeRaffles, raffleInitialized])

  useEffect(() => {
    if (statsQuery.dataUpdatedAt || analyticsQuery.dataUpdatedAt) {
      setLastUpdated(new Date())
    }
  }, [statsQuery.dataUpdatedAt, analyticsQuery.dataUpdatedAt])

  const soldTickets = Number(stats?.tickets.sold_tickets ?? 0)
  const totalTickets = Number(stats?.tickets.total_tickets ?? 0)
  const ticketProgress =
    totalTickets > 0 ? Math.min(100, Math.round((soldTickets / totalTickets) * 100)) : 0

  const pendingCount = Number(stats?.sales.pending_sales ?? 0)

  const cards = useMemo(
    () => [
      { label: "Ventas aprobadas", value: stats?.sales.approved_sales ?? 0, highlight: false },
      { label: "Pendientes", value: pendingCount, highlight: true },
      { label: "Boletos vendidos", value: soldTickets, highlight: false },
      {
        label: "Ingresos aprobados",
        value: formatCurrency(stats?.sales.total_revenue ?? analytics?.totalRevenue ?? 0),
        highlight: false,
      },
    ],
    [stats, analytics, soldTickets, pendingCount],
  )

  const isRefreshing = statsQuery.isFetching || analyticsQuery.isFetching

  function refreshAll() {
    void statsQuery.refetch()
    void analyticsQuery.refetch()
  }

  const selectedRaffleName =
    activeRaffles.find((r) => String(r.id) === raffleId)?.name ?? "Rifa seleccionada"

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Dashboard"
        description="Resumen operativo en tiempo casi real"
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-muted-foreground text-xs tabular-nums">
              Actualizado: {formatLastUpdated(lastUpdated)}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={isRefreshing}
              onClick={refreshAll}
            >
              <RefreshCw className={cn("mr-2 size-4", isRefreshing && "animate-spin")} />
              Actualizar
            </Button>
          </div>
        }
      />

      <div className="bg-background/95 sticky top-14 z-30 -mx-4 border-b px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:top-0 lg:mx-0 lg:rounded-xl lg:border lg:px-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Select
            value={raffleId || "all"}
            onValueChange={(v) => setRaffleId(v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-11 w-full sm:max-w-xs" aria-label="Filtrar por rifa">
              <SelectValue placeholder="Rifa activa" />
            </SelectTrigger>
            <SelectContent>
              {activeRaffles.length > 1 && (
                <SelectItem value="all">Todas las rifas activas</SelectItem>
              )}
              {activeRaffles.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PeriodFilter value={days} onChange={setDays} />
        </div>
        {raffleId && (
          <p className="text-muted-foreground mt-2 text-xs">
            Mostrando métricas de: <span className="font-medium">{selectedRaffleName}</span>
          </p>
        )}
      </div>

      {!activeRaffles.length && !statsQuery.isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="font-medium">No hay rifas activas</p>
            <p className="text-muted-foreground max-w-sm text-sm">
              Publica una rifa para ver métricas y gráficos en este panel.
            </p>
            <Button asChild className="min-h-11">
              <Link to="/admin/crear">Crear rifa</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {statsQuery.isLoading && !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Card
              key={card.label}
              className={cn(
                card.highlight &&
                  Number(card.value) > 0 &&
                  "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20",
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {card.label}
                  {card.highlight && Number(card.value) > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 ml-1">· revisar</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={cn(
                    "text-2xl font-semibold tabular-nums",
                    card.highlight &&
                      Number(card.value) > 0 &&
                      "text-amber-700 dark:text-amber-300",
                  )}
                >
                  {card.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pendingCount > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                {pendingCount} compra{pendingCount === 1 ? "" : "s"} pendiente
                {pendingCount === 1 ? "" : "s"} de revisión
              </p>
              <p className="text-muted-foreground text-sm">
                Revisa comprobantes y aprueba desde la bandeja de compras.
              </p>
            </div>
            <Button asChild variant="outline" className="min-h-11 shrink-0">
              <Link to="/admin/compras" search={{ status: "pending" }}>
                Ir a compras
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {totalTickets > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Progreso de boletos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {soldTickets.toLocaleString("es-VE")} / {totalTickets.toLocaleString("es-VE")}{" "}
                vendidos
              </span>
              <span className="font-medium tabular-nums">{ticketProgress}%</span>
            </div>
            <div className="bg-muted h-2.5 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${ticketProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventas por día</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] md:h-[300px]">
            <SalesTrendChart
              data={analytics?.salesOverTime ?? []}
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
              data={analytics?.revenueByMethod ?? stats?.revenue_by_method ?? []}
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
              data={analytics?.statusDistribution ?? []}
              isLoading={analyticsQuery.isLoading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen del período</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-xs">Ingresos aprobados</p>
                <p className="text-xl font-semibold tabular-nums">
                  {formatCurrency(analytics?.totalRevenue ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Promedio ventas/día</p>
                <p className="text-xl font-semibold tabular-nums">
                  {(analytics?.dailyAverage ?? 0).toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Clientes únicos</p>
                <p className="text-xl font-semibold tabular-nums">
                  {stats?.users.total_customers ?? 0}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Ventas en período</p>
                <p className="text-xl font-semibold tabular-nums">
                  {analytics?.salesOverTime.reduce((sum, row) => sum + row.count, 0) ?? 0}
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="min-h-11 w-full">
              <Link to="/admin/analytics">Ver análisis completo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
