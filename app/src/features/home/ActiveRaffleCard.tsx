import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Clock, Ticket, Trophy } from "lucide-react"

type ActiveRaffle = {
  id: number | string
  name: string
  description?: string | null
  total_tickets: number | string
  tickets_sold: number | string
  tickets_available: number | string
  price_bs: number | string
  price_usd: number | string
  days_remaining?: number | null
  prizes?: unknown[]
  total_prizes?: number | string
}

export function ActiveRaffleCard({ raffle }: { raffle: ActiveRaffle }) {
  const progress = Math.round(
    (Number(raffle.tickets_sold) / Number(raffle.total_tickets)) * 100,
  )

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary/10 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-xl">{raffle.name}</CardTitle>
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            ACTIVA
          </span>
        </div>
        {raffle.description && (
          <p className="text-muted-foreground text-sm">{raffle.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progreso de ventas</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-secondary">
            <div
              className="h-3 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{raffle.tickets_sold} vendidos</span>
            <span>{raffle.tickets_available} disponibles</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-secondary p-3">
            <Ticket size={18} className="mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{raffle.total_tickets}</p>
            <p className="text-muted-foreground text-xs">Boletos</p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <Trophy size={18} className="mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold">
              {raffle.prizes?.length ?? raffle.total_prizes ?? 0}
            </p>
            <p className="text-muted-foreground text-xs">Premios</p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <Clock size={18} className="mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold">
              {raffle.days_remaining != null ? `${raffle.days_remaining}d` : "—"}
            </p>
            <p className="text-muted-foreground text-xs">Restantes</p>
          </div>
        </div>

        <div className="flex justify-center gap-6 text-sm">
          <span className="font-semibold">Bs {Number(raffle.price_bs).toFixed(2)}</span>
          <span className="font-semibold">$ {Number(raffle.price_usd).toFixed(2)}</span>
          <span className="text-muted-foreground">por boleto</span>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button asChild>
            <Link to="/rifa/$id" params={{ id: String(raffle.id) }}>
              Ver rifa <ArrowRight size={16} className="ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
