import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { PurchaseDetailDialog, type PurchaseDetail } from "@/features/admin/PurchaseDetailDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { adminFetch } from "@/lib/admin-fetch"
import { formatCurrency, formatDateTime, getPurchaseStatusClass, getStatusLabel } from "@/lib/format"
import { CheckCircle, Eye, RefreshCw, XCircle } from "lucide-react"

type DashboardStats = {
  raffles: Record<string, number>
  tickets: Record<string, number>
  sales: Record<string, number>
  users: Record<string, number>
  recent_sales: PurchaseRow[]
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

export function AdminDashboard() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseDetail | null>(null)

  const statsQuery = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => adminFetch<DashboardStats>("/api/admin/dashboard"),
  })

  const purchasesQuery = useQuery({
    queryKey: ["admin", "purchases", statusFilter, search],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50", page: "1", status: statusFilter })
      if (search.trim()) {
        params.set("search", search.trim())
        params.set("search_type", "all")
      }
      return adminFetch<{ data: PurchaseRow[] }>(`/api/admin/purchases/?${params}`)
    },
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
  const purchases = purchasesQuery.data?.data ?? []

  const cards = useMemo(
    () => [
      { label: "Rifas activas", value: stats?.raffles.active_raffles ?? 0 },
      { label: "Ventas aprobadas", value: stats?.sales.approved_sales ?? 0 },
      { label: "Pendientes", value: stats?.sales.pending_sales ?? 0 },
      { label: "Ingresos", value: formatCurrency(stats?.sales.total_revenue ?? 0) },
    ],
    [stats],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Resumen de ventas y rifas</p>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Ventas recientes</CardTitle>
          <div className="flex flex-wrap gap-2">
            <select
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
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
              className="w-full sm:w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
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
                  className="hover:bg-muted/40 border-b last:border-0"
                >
                  <td className="py-3 pr-3">
                    <p className="font-medium">{purchase.customer_name}</p>
                    <p className="text-muted-foreground text-xs">{purchase.customer_phone}</p>
                  </td>
                  <td className="py-3 pr-3">{purchase.raffle_name}</td>
                  <td className="py-3 pr-3">{purchase.ticket_quantity}</td>
                  <td className="py-3 pr-3">{formatCurrency(purchase.total_amount)}</td>
                  <td className="py-3 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPurchaseStatusClass(purchase.status)}`}
                    >
                      {getStatusLabel(purchase.status)}
                    </span>
                  </td>
                  <td className="py-3 pr-3">{formatDateTime(purchase.created_at)}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPurchase(purchase)}
                        title="Ver detalle"
                      >
                        <Eye className="size-4" />
                      </Button>
                      {purchase.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({ id: purchase.id, status: "approved" })
                            }
                            title="Aprobar"
                          >
                            <CheckCircle className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({ id: purchase.id, status: "rejected" })
                            }
                            title="Rechazar"
                          >
                            <XCircle className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {purchases.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">No hay ventas para mostrar.</p>
          )}
        </CardContent>
      </Card>

      <PurchaseDetailDialog
        purchase={selectedPurchase}
        open={selectedPurchase != null}
        onOpenChange={(open) => !open && setSelectedPurchase(null)}
      />
    </div>
  )
}
