import { Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowSquareOut,
  ChartBar,
  PencilSimple,
  Receipt,
  Ticket,
} from "@phosphor-icons/react"
import { PLATFORM_TOTAL_TICKETS } from "@raffle/shared/validators"
import { toast } from "sonner"
type AdminRaffleDetailData = {
  id: number
  name: string
  description: string | null
  image_url: string | null
  total_tickets: number
  price_bs: number | string
  price_usd: number | string
  min_purchase: number
  max_purchase: number
  draw_date: string | null
  status: string
  publish: number | boolean
  tickets_sold: number
  tickets_reserved: number
  tickets_available: number
  prizes: Array<{
    name: string
    description: string | null
    image_url: string | null
    position: number
  }>
  payment_methods: Array<{
    method_type: string
    account_info: string | Record<string, string>
    min_tickets: number | null
    is_active: boolean
  }>
}
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { RaffleStatusBadge } from "@/features/admin/raffles/RaffleStatusBadge"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { adminFetch } from "@/lib/admin-fetch"
import { formatCurrency, formatDate } from "@/lib/format"
import { useState } from "react"

const METHOD_LABELS: Record<string, string> = {
  pago_movil: "Pago móvil",
  zinli: "Zinli",
  zelle: "Zelle",
  binance: "Binance",
  bs: "Bolívares",
  usd: "Dólares",
}

function parseAccountInfo(info: string | Record<string, string>) {
  if (typeof info === "string") {
    try {
      return JSON.parse(info) as Record<string, string>
    } catch {
      return {}
    }
  }
  return info
}

export function AdminRaffleDetail({ raffleId }: { raffleId: string }) {
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState<"pause" | "unpause" | "publish" | null>(null)

  const raffleQuery = useQuery({
    queryKey: ["admin", "raffle", raffleId],
    queryFn: () => adminFetch<AdminRaffleDetailData>(`/api/admin/raffles/${raffleId}`),
  })

  const actionMutation = useMutation({
    mutationFn: async (action: "pause" | "unpause" | "publish") => {
      if (action === "publish") {
        return adminFetch(`/api/admin/raffles/${raffleId}/publish`, {
          method: "PUT",
          body: JSON.stringify({ publish: true }),
        })
      }
      return adminFetch(`/api/admin/raffles/${raffleId}/${action}`, { method: "POST" })
    },
    onSuccess: () => {
      toast.success("Rifa actualizada")
      void queryClient.invalidateQueries({ queryKey: ["admin", "raffle", raffleId] })
      void queryClient.invalidateQueries({ queryKey: ["admin", "raffles"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const raffle = raffleQuery.data

  if (raffleQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="aspect-video w-full max-w-2xl rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (!raffle) {
    return <p className="text-muted-foreground py-12 text-center">Rifa no encontrada.</p>
  }

  const sold = raffle.tickets_sold
  const reserved = raffle.tickets_reserved
  const total = raffle.total_tickets || PLATFORM_TOTAL_TICKETS
  const occupied = sold + reserved
  const progress = total > 0 ? Math.min(100, Math.round((occupied / total) * 100)) : 0

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={raffle.name}
        description={`Rifa #${raffle.id} · ${PLATFORM_TOTAL_TICKETS.toLocaleString("es-VE")} boletos (0000-9999)`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/admin/edit/$id" params={{ id: raffleId }}>
                <PencilSimple data-icon="inline-start" />
                Editar
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/rifa/$id" params={{ id: raffleId }} target="_blank">
                <ArrowSquareOut data-icon="inline-start" />
                Vista pública
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex flex-col gap-6">
          {raffle.image_url ? (
            <img
              src={raffle.image_url}
              alt=""
              className="aspect-video w-full max-h-80 rounded-xl object-cover"
            />
          ) : null}

          {raffle.description ? (
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-base">Descripción</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">{raffle.description}</p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Ventas</CardTitle>
              <CardDescription>
                {sold} vendidos · {reserved} reservados · {raffle.tickets_available} disponibles
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progreso</span>
                <span className="font-medium tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} />
              <p className="text-muted-foreground text-xs tabular-nums">
                {occupied} / {total} boletos asignados
              </p>
            </CardContent>
          </Card>

          {raffle.prizes.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Premios</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {raffle.prizes.map((prize, index) => (
                  <div key={`${prize.name}-${index}`} className="flex gap-3 rounded-lg border p-3">
                    {prize.image_url ? (
                      <img
                        src={prize.image_url}
                        alt=""
                        className="size-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="bg-muted flex size-16 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                        {prize.position}°
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">{prize.name}</p>
                      {prize.description ? (
                        <p className="text-muted-foreground mt-1 text-sm">{prize.description}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {raffle.payment_methods.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Métodos de pago</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {raffle.payment_methods.map((method) => {
                  const info = parseAccountInfo(method.account_info)
                  return (
                    <div key={method.method_type} className="rounded-lg border p-3 text-sm">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {METHOD_LABELS[method.method_type] ?? method.method_type}
                        </span>
                        {method.min_tickets != null && method.min_tickets > 0 ? (
                          <Badge variant="secondary">Mín. {method.min_tickets} boletos</Badge>
                        ) : null}
                        {!method.is_active ? (
                          <Badge variant="outline">Inactivo</Badge>
                        ) : null}
                      </div>
                      <div className="text-muted-foreground flex flex-col gap-0.5">
                        {Object.entries(info).map(([key, value]) =>
                          value ? (
                            <p key={key} className="capitalize">
                              {key.replace(/_/g, " ")}:{" "}
                              <span className="text-foreground">{value}</span>
                            </p>
                          ) : null,
                        )}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">Estado</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <RaffleStatusBadge status={raffle.status} />
              <p className="text-muted-foreground text-sm">
                Sorteo:{" "}
                {raffle.draw_date
                  ? formatDate(raffle.draw_date)
                  : "Indefinido (hasta vender todo)"}
              </p>
              <Separator />
              <p className="text-sm tabular-nums">
                {formatCurrency(raffle.price_bs)} · {formatCurrency(raffle.price_usd, "USD")}
              </p>
              <p className="text-muted-foreground text-xs">
                Compra {raffle.min_purchase}–{raffle.max_purchase} boletos
              </p>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {raffle.status === "active" && (
                <Button
                  variant="outline"
                  className="min-h-11 w-full justify-start"
                  disabled={actionMutation.isPending}
                  onClick={() => setConfirm("pause")}
                >
                  Pausar ventas
                </Button>
              )}
              {raffle.status === "paused" && (
                <Button
                  variant="outline"
                  className="min-h-11 w-full justify-start"
                  disabled={actionMutation.isPending}
                  onClick={() => setConfirm("unpause")}
                >
                  Reanudar ventas
                </Button>
              )}
              {raffle.status === "finished" && !raffle.publish && (
                <Button
                  className="min-h-11 w-full"
                  disabled={actionMutation.isPending}
                  onClick={() => setConfirm("publish")}
                >
                  Publicar resultados
                </Button>
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">Atajos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild variant="outline" className="min-h-11 w-full justify-start">
                <Link to="/admin/compras" search={{ raffle_id: raffleId }}>
                  <Receipt data-icon="inline-start" />
                  Compras
                </Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11 w-full justify-start">
                <Link to="/admin/analytics">
                  <ChartBar data-icon="inline-start" />
                  Análisis
                </Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11 w-full justify-start">
                <Link to="/admin/boletos">
                  <Ticket data-icon="inline-start" />
                  Buscar boleto
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      <ConfirmAction
        open={confirm === "pause"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Pausar rifa"
        description={`¿Pausar "${raffle.name}"?`}
        confirmLabel="Pausar"
        pending={actionMutation.isPending}
        onConfirm={() => {
          actionMutation.mutate("pause")
          setConfirm(null)
        }}
      />
      <ConfirmAction
        open={confirm === "unpause"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Reanudar rifa"
        description={`¿Reanudar "${raffle.name}"?`}
        confirmLabel="Reanudar"
        pending={actionMutation.isPending}
        onConfirm={() => {
          actionMutation.mutate("unpause")
          setConfirm(null)
        }}
      />
      <ConfirmAction
        open={confirm === "publish"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Publicar resultados"
        description={`¿Publicar resultados de "${raffle.name}"?`}
        confirmLabel="Publicar"
        pending={actionMutation.isPending}
        onConfirm={() => {
          actionMutation.mutate("publish")
          setConfirm(null)
        }}
      />
    </div>
  )
}
