import { ArrowSquareOut, ChartBar, PencilSimple, Receipt, Ticket } from "@phosphor-icons/react"
import { paymentMethodDisplayLabel } from "@raffle/shared/payment-methods"
import { PLATFORM_TOTAL_TICKETS, RaffleStatus } from "@raffle/shared/validators"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminRaffleMissing } from "@/features/admin/raffles/AdminRaffleMissing"
import { AdminRaffleStatusControl } from "@/features/admin/raffles/AdminRaffleStatusControl"
import { useAdminRaffleDetailQuery } from "@/features/admin/raffles/admin-raffle-detail-queries"
import { RafflePromotionsPanel } from "@/features/admin/raffles/RafflePromotionsPanel"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { PaymentMethodSummary } from "@/features/raffle/PaymentMethodSummary"
export function AdminRaffleDetail({ raffleId }: { raffleId: string }) {
  const raffleQuery = useAdminRaffleDetailQuery(raffleId)

  if (raffleQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="aspect-video w-full max-w-2xl rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (raffleQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="text-lg font-medium">No se pudo cargar la rifa</p>
        <p className="text-muted-foreground max-w-sm text-sm">{raffleQuery.error.message}</p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => void raffleQuery.refetch()}
        >
          Reintentar
        </Button>
      </div>
    )
  }

  const raffle = raffleQuery.data
  if (raffle == null) {
    return <AdminRaffleMissing raffleId={raffleId} />
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
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {raffle.description}
                </p>
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

          <RafflePromotionsPanel
            raffleId={raffleId}
            priceBs={raffle.price_bs}
            priceUsd={raffle.price_usd}
            paymentMethods={raffle.payment_methods.map((m) => ({
              id: m.id,
              label: paymentMethodDisplayLabel(m),
            }))}
          />

          {raffle.payment_methods.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Métodos de pago</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {raffle.payment_methods.map((method) => (
                  <PaymentMethodSummary key={method.id} method={method} variant="admin" />
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <AdminRaffleStatusControl
            raffleId={raffleId}
            raffleName={raffle.name}
            status={RaffleStatus.parse(raffle.status)}
            publish={Boolean(raffle.publish)}
            drawDate={raffle.draw_date}
            priceBs={raffle.price_bs}
            priceUsd={raffle.price_usd}
            minPurchase={raffle.min_purchase}
            maxPurchase={raffle.max_purchase}
          />

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
    </div>
  )
}
