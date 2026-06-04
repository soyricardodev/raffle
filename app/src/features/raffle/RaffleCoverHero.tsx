import { Pause } from "lucide-react"
import { SalesProgressBar } from "@/features/home/SalesProgressBar"
import { useRaffleSalesProgress } from "@/features/home/use-raffle-sales-progress"
import type { RaffleProgressInput } from "@/lib/raffle-progress"
import { cn } from "@/lib/utils"

type RaffleCoverHeroProps = {
  raffleId: string | number
  imageUrl: string
  imageAlt: string
  status?: string
  tickets: RaffleProgressInput
  liveEnabled?: boolean
  edgeBleed?: boolean
}

export function RaffleCoverHero({
  raffleId,
  imageUrl,
  imageAlt,
  status = "active",
  tickets,
  liveEnabled = true,
  edgeBleed = false,
}: RaffleCoverHeroProps) {
  const progress = useRaffleSalesProgress({ raffleId, raffle: tickets, liveEnabled })
  const isPaused = status === "paused"

  return (
    <figure
      className={cn(
        "relative w-full overflow-hidden bg-muted",
        edgeBleed ? "-mx-4 w-auto sm:mx-0 sm:rounded-xl" : "rounded-xl",
      )}
    >
      <img
        src={imageUrl}
        alt={imageAlt}
        className="block w-full h-auto max-h-[min(85vh,720px)]"
        fetchPriority="high"
        decoding="async"
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent"
        aria-hidden
      />

      <figcaption className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4">
        <SalesProgressBar progress={progress} variant="overlay" animated />
      </figcaption>

      {isPaused && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/45 backdrop-blur-[2px]">
          <span className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/95 px-3 py-1.5 text-xs font-semibold text-amber-950 shadow-sm">
            <Pause className="size-3.5" aria-hidden />
            Ventas pausadas
          </span>
        </div>
      )}
    </figure>
  )
}
