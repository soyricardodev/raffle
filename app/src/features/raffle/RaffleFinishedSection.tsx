import { Link } from "@tanstack/react-router"
import { CheckCircle2, Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { RaffleCoverHero } from "@/features/raffle/RaffleCoverHero"
import {
  type RaffleLandingRaffle,
  raffleTicketsInput,
} from "@/features/raffle/raffle-landing-types"
import { buildVerifyHref } from "@/features/verify/build-verify-href"
import { cn } from "@/lib/utils"

type FinishedPrize = {
  name: string
  description?: string | null
  image_url?: string | null
  position: number
}

type RaffleFinishedSectionProps = {
  raffle: RaffleLandingRaffle & {
    prizes?: FinishedPrize[]
    publish?: number
    draw_date?: string | null
  }
  edgeBleed?: boolean
}

export function RaffleFinishedSection({
  raffle,
  edgeBleed = false,
}: RaffleFinishedSectionProps) {
  const tickets = raffleTicketsInput(raffle)
  const hasCover = Boolean(raffle.image_url)
  const sortedPrizes = [...(raffle.prizes ?? [])].sort((a, b) => a.position - b.position)

  return (
    <div className="space-y-3 sm:space-y-4" data-testid="raffle-finished-section">
      {hasCover ? (
        <RaffleCoverHero
          raffleId={raffle.id}
          imageUrl={raffle.image_url!}
          imageAlt={raffle.name}
          status="finished"
          tickets={tickets}
          liveEnabled={false}
          edgeBleed={edgeBleed}
        />
      ) : null}

      <FinishedStatusBanner />

      {sortedPrizes.length > 0 ? <FinishedPrizesList prizes={sortedPrizes} /> : null}
    </div>
  )
}

function FinishedStatusBanner() {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border px-4 py-4",
        "border-blue-500/25 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="font-heading text-lg font-bold tracking-tight text-blue-950 dark:text-blue-50">
            Rifa finalizada con éxito:
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Las ventas están cerradas. Si compraste verifica tus boletos arriba en{" "}
            <Link
              {...buildVerifyHref()}
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              “Buscar mis boletos”
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function FinishedPrizesList({ prizes }: { prizes: FinishedPrize[] }) {
  return (
    <Card className="overflow-hidden shadow-none">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Trophy className="text-primary size-4 shrink-0" aria-hidden />
          <h2 className="font-heading text-base font-semibold">Premios</h2>
        </div>
        <ul className="space-y-2">
          {prizes.map((prize) => (
            <li
              key={`${prize.position}-${prize.name}`}
              className="bg-muted/40 flex items-start gap-3 rounded-lg border p-3"
            >
              {prize.image_url ? (
                <img
                  src={prize.image_url}
                  alt=""
                  className="size-12 shrink-0 rounded-md object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-md text-sm font-bold tabular-nums">
                  {prize.position}
                </span>
              )}
              <div className="min-w-0">
                <p className="font-medium leading-snug">{prize.name}</p>
                {prize.description ? (
                  <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                    {prize.description}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
