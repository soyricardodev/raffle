import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { PurchaseDetailDialog, type PurchaseDetail } from "@/features/admin/PurchaseDetailDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { adminFetch } from "@/lib/admin-fetch"
import {
  formatCurrencyForMethod,
  formatDateTime,
  getPurchaseStatusClass,
  getStatusLabel,
} from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle, Download, Eye, RefreshCw, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type RevenueByMethod = { method: string; count: number; revenue: number }
type ActiveRaffle = { id: number; name: string }

type DashboardStats = {
  raffles: Record<string, number>
  tickets: Record<string, number>
  sales: Record<string, number>
  users: Record<string, number>
  revenue_by_method: RevenueByMethod[]
  active_raffles: ActiveRaffle[]
  recent_sales: PurchaseRow[]
  filtered_raffle_id: number | null
}

type PurchaseRow = {
  id: number
  customer_name: string
  customer_phone: string
  raffle_name: string
  ticket_quantity: number
  total_amount: number | string
  payment_method: string
  status: string
  created_at: string
  ticket_numbers?: string
}

function PurchaseRowActions({
  purchase,
  onView,
  onStatusChange,
  pending,
}: {
  purchase: PurchaseRow
  onView: () => void
  onStatusChange: (status: "approved" | "rejected") => void
  pending: boolean
}) {
  return (
    <div className="flex gap-1">
      <Button size="icon-sm" variant="outline" className="size-11" onClick={onView} title="Ver detalle">
        <Eye className="size-4" />
      </Button>
      {purchase.status === "pending" && (
        <>
          <Button
            size="icon-sm"
            variant="outline"
            className="size-11"
            disabled={pending}
            onClick={() => onStatusChange("approved")}
            title="Aprobar"
          >
            <CheckCircle className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            className="size-11"
            disabled={pending}
            onClick={() => onStatusChange("rejected")}
            title="Rechazar"
          >
            <XCircle className="size-4" />
          </Button>
        </>
      )}
    </div>
  )
}

export function AdminDashboard() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [raffleId, setRaffleId] = useState<string>("")
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseDetail | null>(null)
  const debouncedSearch = useDebouncedValue(search)

  const statsQuery = useQuery({
    queryKey: ["admin", "dashboard", raffleId],
    queryFn: () => {
      const params = raffleId ? `?raffleId=${raffleId}` : ""
      return adminFetch<DashboardStats>(`/api/admin/dashboard${params}`)
    },
  })

  const pageSize = 25

  const purchasesQuery = useInfiniteQuery({
    queryKey: ["admin", "purchases", statusFilter, debouncedSearch, raffleId],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: String(pageSize),
        page: String(pageParam),
        status: statusFilter,
      })
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim())
        params.set("search_type", "all")
      }
      if (raffleId) params.set("raffle_id", raffleId)
      return adminFetch<{ data: PurchaseRow[]; total: number; hasMore: boolean }>(
        `/api/admin/purchases/?${params}`,
      )
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore === false ? undefined : allPages.length + 1,
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "approved" | "rejected" }) => {
      return adminFetch(`/api/admin/purchases/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      })
    },
    onSuccess: () => {
      toast.success("Estado actualizado")
      void queryClient.invalidateQueries({ queryKey: ["admin"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const stats = statsQuery.data
  const purchases =
    purchasesQuery.data?.pages.flatMap((page) => page.data) ?? []
  const hasMore = purchasesQuery.hasNextPage
  const activeRaffles = stats?.active_raffles ?? []

  const cards = useMemo(
    () => [
      { label: "Ventas aprobadas", value: stats?.sales.approved_sales ?? 0, highlight: false },
      { label: "Pendientes", value: stats?.sales.pending_sales ?? 0, highlight: true },
      { label: "Boletos vendidos", value: stats?.tickets.sold_tickets ?? 0, highlight: false },
      {
        label: "Ingresos aprobados",
        value: `Bs ${Number(stats?.sales.total_revenue ?? 0).toFixed(2)}`,
        highlight: false,
      },
    ],
    [stats],
  )

  function exportPurchasesCsv() {
    if (!purchases.length) {
      toast.error("No hay ventas para exportar")
      return
    }
    const header = "id,cliente,telefono,rifa,boletos,total,metodo,estado,fecha"
    const rows = purchases.map((p) =>
      [
        p.id,
        `"${p.customer_name.replace(/"/g, '""')}"`,
        p.customer_phone,
        `"${p.raffle_name.replace(/"/g, '""')}"`,
        p.ticket_quantity,
        p.total_amount,
        p.payment_method,
        p.status,
        p.created_at,
      ].join(","),
    )
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `ventas-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success("CSV descargado")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Operación diaria y caja</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void statsQuery.refetch()
            void purchasesQuery.refetch()
          }}
        >
          <RefreshCw className="mr-2 size-4" />
          Actualizar
        </Button>
      </div>

      <div className="bg-background/95 sticky top-14 z-30 -mx-4 border-b px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:top-0 lg:mx-0 lg:rounded-xl lg:border lg:px-3">
        <select
          className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/30 sm:max-w-xs"
          value={raffleId}
          onChange={(event) => setRaffleId(event.target.value)}
          aria-label="Filtrar por rifa"
        >
          <option value="">Todas las rifas activas</option>
          {activeRaffles.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

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
                    card.highlight && Number(card.value) > 0 && "text-amber-700 dark:text-amber-300",
                  )}
                >
                  {card.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {stats?.revenue_by_method && stats.revenue_by_method.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos por método de pago</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.revenue_by_method.map((row) => (
              <div
                key={row.method}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span className="font-medium uppercase">{row.method.replace(/_/g, " ")}</span>
                <span>{formatCurrencyForMethod(row.revenue, row.method)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Ventas recientes</CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <select
              className="border-input bg-background h-11 min-h-11 rounded-md border px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/30"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobados</option>
              <option value="rejected">Rechazados</option>
            </select>
            <Input
              placeholder="Buscar cliente, teléfono…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-h-11 w-full sm:w-64"
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-11 shrink-0"
              disabled={purchases.length === 0}
              onClick={exportPurchasesCsv}
            >
              <Download className="mr-2 size-4" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3">Rifa</th>
                  <th className="py-2 pr-3">Boletos</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr
                    key={purchase.id}
                    className={cn(
                      "hover:bg-muted/40 border-b last:border-0",
                      purchase.status === "pending" && "bg-amber-500/5",
                    )}
                  >
                    <td className="py-3 pr-3">
                      <p className="font-medium">{purchase.customer_name}</p>
                      <p className="text-muted-foreground text-xs">{purchase.customer_phone}</p>
                    </td>
                    <td className="py-3 pr-3">{purchase.raffle_name}</td>
                    <td className="py-3 pr-3">{purchase.ticket_quantity}</td>
                    <td className="py-3 pr-3">
                      {formatCurrencyForMethod(purchase.total_amount, purchase.payment_method)}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPurchaseStatusClass(purchase.status)}`}
                      >
                        {getStatusLabel(purchase.status)}
                      </span>
                    </td>
                    <td className="py-3 pr-3">{formatDateTime(purchase.created_at)}</td>
                    <td className="py-3">
                      <PurchaseRowActions
                        purchase={purchase}
                        pending={statusMutation.isPending}
                        onView={() => setSelectedPurchase(purchase)}
                        onStatusChange={(status) =>
                          statusMutation.mutate({ id: purchase.id, status })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {purchasesQuery.isLoading && purchases.length === 0 && (
            <div className="space-y-3 md:hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          )}

          <div className="space-y-3 md:hidden">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className={cn(
                  "rounded-xl border p-4",
                  purchase.status === "pending" && "border-amber-500/40 bg-amber-500/5",
                )}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{purchase.customer_name}</p>
                    <p className="text-muted-foreground text-xs">{purchase.customer_phone}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getPurchaseStatusClass(purchase.status)}`}
                  >
                    {getStatusLabel(purchase.status)}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">{purchase.raffle_name}</p>
                <p className="mt-1 text-sm font-semibold">
                  {purchase.ticket_quantity} boletos ·{" "}
                  {formatCurrencyForMethod(purchase.total_amount, purchase.payment_method)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatDateTime(purchase.created_at)}
                </p>
                <div className="mt-3">
                  <PurchaseRowActions
                    purchase={purchase}
                    pending={statusMutation.isPending}
                    onView={() => setSelectedPurchase(purchase)}
                    onStatusChange={(status) =>
                      statusMutation.mutate({ id: purchase.id, status })
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          {purchases.length === 0 && !purchasesQuery.isLoading && (
            <p className="text-muted-foreground py-8 text-center text-sm">No hay ventas para mostrar.</p>
          )}
          {hasMore && (
            <div className="pt-4 text-center">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={purchasesQuery.isFetchingNextPage}
                onClick={() => void purchasesQuery.fetchNextPage()}
              >
                {purchasesQuery.isFetchingNextPage ? "Cargando…" : "Cargar más"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <PurchaseDetailDialog
        purchase={selectedPurchase}
        open={selectedPurchase != null}
        onOpenChange={(open) => !open && setSelectedPurchase(null)}
        onPurchaseUpdated={(patch) =>
          setSelectedPurchase((prev) => (prev ? { ...prev, ...patch } : prev))
        }
      />
    </div>
  )
}
