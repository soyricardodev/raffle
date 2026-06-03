import { explorePurchasesSearchParams } from "@raffle/shared/analytics"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { funnelEventLabel } from "@/features/admin/analytics/types"
import type { AnalyticsPeriodState } from "@/features/admin/analytics/types"
import { PurchaseStatusBadge } from "@/features/admin/purchases/PurchaseStatusBadge"
import type { PurchaseRow } from "@/features/admin/purchases/types"
import { adminFetch } from "@/lib/admin-fetch"
import { formatCurrencyForMethod, formatDateTime } from "@/lib/format"

type ExploreResponse = {
  data: PurchaseRow[]
  total: number
  hasMore: boolean
}

type AnalyticsExploreTabProps = {
  period: AnalyticsPeriodState
  raffleId: string
}

export function AnalyticsExploreTab({ period, raffleId }: AnalyticsExploreTabProps) {
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)

  const queryKey = ["admin", "analytics", "explore", period, raffleId, status, page]

  const exploreQuery = useQuery({
    queryKey,
    queryFn: () => {
      const params = explorePurchasesSearchParams(period, {
        raffleId: raffleId || undefined,
        page,
        limit: 25,
        status,
      })
      return adminFetch<ExploreResponse>(`/api/admin/purchases?${params}`)
    },
  })

  const rows = exploreQuery.data?.data ?? []
  const totalPages = Math.max(1, Math.ceil((exploreQuery.data?.total ?? 0) / 25))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-11 w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="approved">Aprobado</SelectItem>
            <SelectItem value="rejected">Rechazado</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-sm">{exploreQuery.data?.total ?? 0} compras en el filtro</p>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Ubicación</th>
                <th className="px-4 py-3 font-medium">Rifa</th>
                <th className="px-4 py-3 font-medium">Boletos</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3 tabular-nums">{formatDateTime(row.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.customer_name}</p>
                    <p className="text-muted-foreground text-xs">{row.customer_phone}</p>
                  </td>
                  <td className="text-muted-foreground max-w-40 truncate px-4 py-3">
                    {row.customer_location || "—"}
                  </td>
                  <td className="max-w-36 truncate px-4 py-3">{row.raffle_name}</td>
                  <td className="px-4 py-3 tabular-nums">{row.ticket_quantity}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatCurrencyForMethod(Number(row.total_amount), row.payment_method)}
                  </td>
                  <td className="px-4 py-3">
                    <PurchaseStatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
              {!rows.length && !exploreQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="text-muted-foreground px-4 py-8 text-center">
                    Sin compras para estos filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          className="min-h-11"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Anterior
        </Button>
        <span className="text-muted-foreground text-sm tabular-nums">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}

export function FunnelList({
  events,
}: {
  events: Array<{ event: string; count: number }>
}) {
  if (!events.length) {
    return <p className="text-muted-foreground text-sm">Sin eventos de post-compra en el período.</p>
  }

  const max = Math.max(...events.map((e) => e.count), 1)

  return (
    <ul className="space-y-3">
      {events.map((row) => (
        <li key={row.event}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>{funnelEventLabel(row.event)}</span>
            <span className="font-medium tabular-nums">{row.count}</span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
