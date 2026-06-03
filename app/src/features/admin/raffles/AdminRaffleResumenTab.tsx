import { ChartBar, Receipt, Ticket } from "@phosphor-icons/react"
import { paymentMethodDisplayLabel } from "@raffle/shared/payment-methods"
import { PLATFORM_TOTAL_TICKETS, RaffleStatus } from "@raffle/shared/validators"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AdminRaffleStatusControl } from "@/features/admin/raffles/AdminRaffleStatusControl"
import type { AdminRaffleDetail } from "@/features/admin/raffles/admin-raffle-detail-queries"
import { RafflePromotionsPanel } from "@/features/admin/raffles/RafflePromotionsPanel"
import { PaymentMethodSummary } from "@/features/raffle/PaymentMethodSummary"

type AdminRaffleResumenTabProps = {
  raffleId: string
  raffle: AdminRaffleDetail
}

export function AdminRaffleResumenTab({ raffleId, raffle }: AdminRaffleResumenTabProps) {
  const sold = raffle.tickets_sold
  const reserved = raffle.tickets_reserved
  const total = raffle.total_tickets || PLATFORM_TOTAL_TICKETS
  const occupied = sold + reserved
  const progress = total > 0 ? Math.min(100, Math.round((occupied / total) * 100)) : 0

  return (
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
              {raffle.prizes.map((prize) => (
                <div
                  key={`${prize.position}-${prize.name}`}
                  className="flex gap-3 rounded-lg border p-3"
                >
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
  )
}
