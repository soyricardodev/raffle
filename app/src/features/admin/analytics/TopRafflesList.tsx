import { formatCurrency } from "@/lib/format"

type TopRaffle = {
  id: number
  name: string
  totalSales: number
  totalRevenue: number
  ticketCount: number
}

export function TopRafflesList({ raffles }: { raffles: TopRaffle[] }) {
  if (!raffles.length) {
    return <p className="text-muted-foreground text-sm">Sin rifas con ventas.</p>
  }

  return (
    <ul className="space-y-3">
      {raffles.map((raffle, index) => (
        <li
          key={raffle.id}
          className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <div className="min-w-0">
            <span className="text-muted-foreground mr-2 font-mono text-xs">#{index + 1}</span>
            <span className="font-medium">{raffle.name}</span>
            <p className="text-muted-foreground text-xs">
              {raffle.totalSales} ventas · {raffle.ticketCount} boletos
            </p>
          </div>
          <span className="shrink-0 font-semibold">{formatCurrency(raffle.totalRevenue)}</span>
        </li>
      ))}
    </ul>
  )
}
