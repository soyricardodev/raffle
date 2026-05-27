import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"

type PublishedRaffle = {
  id: number | string
  name: string
  tickets_sold: number | string
  total_tickets: number | string
  sold_percentage: number | string
}

export function PublishedRafflesGrid({ raffles }: { raffles: PublishedRaffle[] }) {
  return (
    <section className="mx-auto max-w-lg px-4 py-10">
      <h2 className="text-muted-foreground mb-3 text-xs font-medium">Rifas anteriores</h2>
      <ul className="divide-border divide-y rounded-xl border">
        {raffles.slice(0, 6).map((raffle) => (
          <li key={String(raffle.id)}>
            <Link
              to="/rifa/$id"
              params={{ id: String(raffle.id) }}
              className="hover:bg-muted/50 flex items-center justify-between gap-3 px-4 py-3 transition-colors"
            >
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-medium">{raffle.name}</p>
                <p className="text-muted-foreground text-xs">
                  {raffle.sold_percentage}% vendido
                </p>
              </div>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
