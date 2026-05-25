import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { PublicLayout } from "@/features/layout/PublicLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket, Trophy, Clock } from "lucide-react"

async function fetchRaffle(id: string) {
  const res = await fetch(`/api/raffles/${id}`)
  if (!res.ok) throw new Error("Rifa no encontrada")
  return res.json()
}

export const Route = createFileRoute("/rifa/$id")({
  component: RaffleDetailPage,
})

function RaffleDetailPage() {
  const { id } = Route.useParams()

  const { data: raffle, isLoading } = useQuery({
    queryKey: ["raffle", id],
    queryFn: () => fetchRaffle(id),
  })

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto flex items-center justify-center py-20">
          <p className="text-muted-foreground animate-pulse">Cargando rifa...</p>
        </div>
      </PublicLayout>
    )
  }

  if (!raffle) {
    return (
      <PublicLayout>
        <div className="container mx-auto py-20 text-center">
          <h1 className="text-2xl font-bold">Rifa no encontrada</h1>
        </div>
      </PublicLayout>
    )
  }

  const progress = Math.round((Number(raffle.tickets_sold) / Number(raffle.total_tickets)) * 100)

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">{raffle.name}</CardTitle>
            <p className="text-muted-foreground">{raffle.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-secondary p-3">
                <Ticket size={18} className="mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{raffle.total_tickets}</p>
                <p className="text-muted-foreground text-xs">Boletos</p>
              </div>
              <div className="rounded-lg bg-secondary p-3">
                <Trophy size={18} className="mx-auto mb-1 text-amber-500" />
                <p className="text-lg font-bold">{raffle.prizes?.length ?? 0}</p>
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

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progreso</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-secondary">
                <div
                  className="h-3 rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex justify-center gap-6 text-sm">
              <span className="font-semibold">Bs {Number(raffle.price_bs).toFixed(2)}</span>
              <span className="font-semibold">$ {Number(raffle.price_usd).toFixed(2)}</span>
              <span className="text-muted-foreground">por boleto</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  )
}
