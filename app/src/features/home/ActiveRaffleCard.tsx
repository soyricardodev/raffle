import { Link } from "@tanstack/react-router"
import { ArrowRight, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SalesProgressBar } from "@/features/home/SalesProgressBar"
import { RaffleEyebrow } from "@/features/raffle/RaffleEyebrow"
import { getRaffleStatusClass, getStatusLabel } from "@/lib/format"
import { calculateRaffleSalesProgress } from "@/lib/raffle-progress"
import { cn } from "@/lib/utils"

type ActiveRaffle = {
  id: number | string
  name: string
  description?: string | null
  image_url?: string | null
  status?: string
  total_tickets: number | string
  tickets_sold: number | string
  tickets_available: number | string
  tickets_reserved?: number | string
  price_bs: number | string
  price_usd: number | string
  days_remaining?: number | null
  prizes?: unknown[]
  total_prizes?: number | string
}

type ActiveRaffleCardProps = {
  raffle: ActiveRaffle
  showCta?: boolean
  /** Home: ocultar si la portada ya muestra imagen/título. */
  showImage?: boolean
  showTitle?: boolean
  /** Home: compacto. Detalle: card completa con imagen grande. */
  variant?: "compact" | "detail"
  /** Ocultar si la portada ya muestra la barra animada. */
  showProgress?: boolean
}

export function ActiveRaffleCard({
  raffle,
  showCta = true,
  showImage = true,
  showTitle = true,
  variant = "detail",
  showProgress = true,
}: ActiveRaffleCardProps) {
  const salesProgress = calculateRaffleSalesProgress(raffle)
  const isPaused = raffle.status === "paused"
  const isCompact = variant === "compact"

  if (isCompact) {
    const usingPageCover = !showImage && !showTitle && Boolean(raffle.image_url)
    const showCoverImage = showImage && Boolean(raffle.image_url)
    const showHeader = !usingPageCover

    return (
      <Card className="overflow-hidden border shadow-none">
        {showCoverImage ? (
          <div className="aspect-[2/1] w-full overflow-hidden sm:aspect-[21/9]">
            <img
              src={raffle.image_url!}
              alt={raffle.name}
              className="size-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}

        <CardContent className="space-y-4 p-4 sm:p-5">
          {showHeader ? (
            <div className="space-y-1 text-left">
              <RaffleEyebrow status={raffle.status ?? "active"} />
              {showTitle ? (
                <h2 className="font-heading text-lg font-semibold leading-snug">{raffle.name}</h2>
              ) : null}
            </div>
          ) : null}

          {isPaused && !usingPageCover && (
            <p className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
              <Pause className="size-3.5 shrink-0" />
              Ventas pausadas temporalmente
            </p>
          )}

          {showProgress ? (
            <SalesProgressBar progress={salesProgress} variant="inline" animated />
          ) : null}
          <p className="text-muted-foreground text-xs tabular-nums">
            {raffle.tickets_available} boletos disponibles
            {raffle.days_remaining != null ? ` · ${raffle.days_remaining} días` : ""}
          </p>

          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t pt-3 text-sm">
            <span className="text-muted-foreground text-xs">Desde</span>
            <div className="flex gap-3 tabular-nums">
              <span className="font-semibold">Bs {Number(raffle.price_bs).toFixed(2)}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-semibold">$ {Number(raffle.price_usd).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="bg-muted relative aspect-[16/9] w-full overflow-hidden">
        {raffle.image_url ? (
          <img
            src={raffle.image_url}
            alt={raffle.name}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="from-muted to-muted/50 flex size-full items-end bg-gradient-to-br p-4">
            <h2 className="font-heading text-xl font-semibold text-foreground">{raffle.name}</h2>
          </div>
        )}
        {isPaused && raffle.image_url && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <span className="rounded-md bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-amber-950">
              Pausada
            </span>
          </div>
        )}
      </div>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {raffle.image_url && (
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-heading text-xl font-semibold">{raffle.name}</h2>
            <span
              className={cn(
                "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                getRaffleStatusClass(raffle.status ?? "active"),
              )}
            >
              {getStatusLabel(raffle.status ?? "active")}
            </span>
          </div>
        )}
        {raffle.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">{raffle.description}</p>
        )}

        {showProgress ? (
          <SalesProgressBar progress={salesProgress} variant="inline" animated />
        ) : null}

        <div className="text-muted-foreground flex justify-between text-sm tabular-nums">
          <span>Bs {Number(raffle.price_bs).toFixed(2)}</span>
          <span>$ {Number(raffle.price_usd).toFixed(2)}</span>
        </div>

        {showCta && (
          <Button asChild className="min-h-11 w-full">
            <Link to="/rifa/$id" params={{ id: String(raffle.id) }}>
              Ver rifa <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
