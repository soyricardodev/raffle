import { Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { adminFetch } from "@/lib/admin-fetch"
import { formatCurrency, formatDate, getRaffleStatusClass, getStatusLabel } from "@/lib/format"
import { Pause, Play, Eye, Pencil } from "lucide-react"

type RaffleRow = {
  id: number
  name: string
  status: string
  total_tickets: number | string
  tickets_sold: number | string
  sold_percentage: string
  price_bs: number | string
  price_usd: number | string
  draw_date: string | null
  publish?: boolean
}

export function AdminRafflesTable() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState("all")
  const [search, setSearch] = useState("")

  const rafflesQuery = useQuery({
    queryKey: ["admin", "raffles", status],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50", page: "1" })
      if (status !== "all") params.set("status", status)
      return adminFetch<RaffleRow[]>(`/api/admin/raffles/?${params}`)
    },
  })

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "pause" | "unpause" | "publish" }) => {
      if (action === "publish") {
        return adminFetch(`/api/admin/raffles/${id}/publish`, {
          method: "PUT",
          body: JSON.stringify({ publish: true }),
        })
      }
      return adminFetch(`/api/admin/raffles/${id}/${action}`, { method: "POST" })
    },
    onSuccess: () => {
      toast.success("Rifa actualizada")
      void queryClient.invalidateQueries({ queryKey: ["admin", "raffles"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const raffles = (rafflesQuery.data ?? []).filter((raffle) =>
    search.trim() ? raffle.name.toLowerCase().includes(search.trim().toLowerCase()) : true,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Mis rifas</h1>
          <p className="text-muted-foreground text-sm">Gestiona el estado de tus rifas</p>
        </div>
        <Button asChild>
          <Link to="/admin/crear">Nueva rifa</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Listado</CardTitle>
          <div className="flex flex-wrap gap-2">
            <select
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">Todas</option>
              <option value="draft">Borrador</option>
              <option value="active">Activas</option>
              <option value="paused">Pausadas</option>
              <option value="finished">Finalizadas</option>
            </select>
            <Input
              placeholder="Buscar rifa…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full sm:w-56"
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="py-2 pr-3">Rifa</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2 pr-3">Ventas</th>
                <th className="py-2 pr-3">Precios</th>
                <th className="py-2 pr-3">Sorteo</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {raffles.map((raffle) => (
                <tr key={raffle.id} className="border-b last:border-0">
                  <td className="py-3 pr-3">
                    <p className="font-medium">{raffle.name}</p>
                    <p className="text-muted-foreground text-xs">ID {raffle.id}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRaffleStatusClass(raffle.status)}`}
                    >
                      {getStatusLabel(raffle.status)}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    {raffle.tickets_sold} / {raffle.total_tickets} ({raffle.sold_percentage}%)
                  </td>
                  <td className="py-3 pr-3">
                    {formatCurrency(raffle.price_bs)} · {formatCurrency(raffle.price_usd, "USD")}
                  </td>
                  <td className="py-3 pr-3">{formatDate(raffle.draw_date)}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button asChild size="sm" variant="outline" title="Ver pública">
                        <Link to="/rifa/$id" params={{ id: String(raffle.id) }}>
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" title="Editar">
                        <Link to="/admin/edit/$id" params={{ id: String(raffle.id) }}>
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                      {raffle.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionMutation.isPending}
                          onClick={() => actionMutation.mutate({ id: raffle.id, action: "pause" })}
                        >
                          <Pause className="size-4" />
                        </Button>
                      )}
                      {raffle.status === "paused" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionMutation.isPending}
                          onClick={() => actionMutation.mutate({ id: raffle.id, action: "unpause" })}
                        >
                          <Play className="size-4" />
                        </Button>
                      )}
                      {raffle.status === "finished" && !raffle.publish && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionMutation.isPending}
                          onClick={() => actionMutation.mutate({ id: raffle.id, action: "publish" })}
                        >
                          Publicar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {raffles.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">No hay rifas en este filtro.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
