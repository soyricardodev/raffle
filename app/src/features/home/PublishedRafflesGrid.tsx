import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type PublishedRaffle = {
  id: number | string
  name: string
  tickets_sold: number | string
  total_tickets: number | string
  sold_percentage: number | string
}

export function PublishedRafflesGrid({ raffles }: { raffles: PublishedRaffle[] }) {
  return (
    <section className="container mx-auto px-4 pb-16">
      <h2 className="text-muted-foreground mb-4 text-center text-sm uppercase tracking-[0.2em]">
        Rifas Finalizadas
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {raffles.slice(0, 6).map((raffle) => (
          <Card key={String(raffle.id)} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{raffle.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                {raffle.tickets_sold} de {raffle.total_tickets} boletos vendidos
              </p>
              <p className="text-muted-foreground text-xs">{raffle.sold_percentage}% completado</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
