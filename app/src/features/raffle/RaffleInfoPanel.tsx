import { CalendarDays, Pause, TrendingUp, Ticket } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SalesProgressBar } from "@/features/home/SalesProgressBar"
import { PromotionCountdown } from "@/features/raffle/PromotionCountdown"
import type { RafflePricing } from "@/features/raffle/promotion-types"
import { useRaffleSalesProgress } from "@/features/home/use-raffle-sales-progress"
import { useRaffleLiveDataOrFetch } from "@/features/raffle/raffle-live-context"
import { raffleTicketsInput } from "@/features/raffle/raffle-landing-types"
import { getRaffleStatusClass, getStatusLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

type RaffleInfoPanelProps = {
  raffleId: string | number
  name: string
  description?: string | null
  status?: string
  tickets: ReturnType<typeof raffleTicketsInput>
  ticketsAvailable: number | string
  drawDate?: string | null
  daysRemaining?: number | null
  priceBs: number | string
  priceUsd: number | string
  pricing?: RafflePricing
  liveEnabled?: boolean
  showProgress?: boolean
  /** Hide when status badge is already on the cover image. */
  showStatusBadge?: boolean
  headingLevel?: 1 | 2
  descriptionLineClamp?: number | false
}

function formatCount(value: number) {
  return new Intl.NumberFormat("es-VE").format(value)
}

function formatPrice(amount: number, currency: "Bs" | "USD") {
  const formatted = amount.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return currency === "Bs" ? `Bs ${formatted}` : `$ ${formatted}`
}

export function RaffleInfoPanel({
  raffleId,
  name,
  description,
  status = "active",
  tickets,
  ticketsAvailable,
  drawDate,
  daysRemaining,
  priceBs,
  priceUsd,
  pricing,
  liveEnabled = true,
  showProgress = false,
  showStatusBadge = true,
  headingLevel = 1,
  descriptionLineClamp = 5,
}: RaffleInfoPanelProps) {
  const progress = useRaffleSalesProgress({ raffleId, raffle: tickets, liveEnabled })
  const live = useRaffleLiveDataOrFetch(raffleId, { enabled: liveEnabled })
  const isPaused = status === "paused"
  const Heading = headingLevel === 1 ? "h1" : "h2"

  const available =
    live.data?.availability.available ?? Math.max(0, Number(ticketsAvailable) || 0)

  const hasScheduledDraw = Boolean(drawDate)
  const showDrawCountdown =
    hasScheduledDraw && daysRemaining != null && Number.isFinite(daysRemaining)
  /** Only when there is no cover (no overlay bar) and no scheduled draw. */
  const showSoldStat = !showProgress && !showDrawCountdown && showStatusBadge

  const baseBs = Number(priceBs)
  const baseUsd = Number(priceUsd)
  const effectiveBs = pricing?.effective_price_bs ?? baseBs
  const effectiveUsd = pricing?.effective_price_usd ?? baseUsd
  const bsOnPromo = pricing?.has_global_promotion && effectiveBs < baseBs
  const usdOnPromo = pricing?.has_global_promotion && effectiveUsd < baseUsd

  return (
    <section className="space-y-4" aria-labelledby="raffle-info-title">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Rifa en curso
          </p>
          <Heading
            id="raffle-info-title"
            className="font-heading text-2xl font-semibold leading-snug text-balance sm:text-3xl"
            style={{ color: "var(--brand-primary, inherit)" }}
          >
            {name}
          </Heading>
        </div>
        {showStatusBadge ? (
          <span
            className={cn(
              "mt-5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              getRaffleStatusClass(status),
            )}
          >
            {isPaused ? "Pausada" : getStatusLabel(status)}
          </span>
        ) : null}
      </header>

      {description ? (
        <p
          className="text-muted-foreground text-sm leading-relaxed sm:text-base"
          style={
            descriptionLineClamp !== false
              ? {
                  display: "-webkit-box",
                  WebkitLineClamp: descriptionLineClamp,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }
              : undefined
          }
        >
          {description}
        </p>
      ) : null}

      {isPaused && showProgress ? (
        <p className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          <Pause className="size-3.5 shrink-0" aria-hidden />
          Ventas pausadas temporalmente
        </p>
      ) : null}

      {showProgress ? <SalesProgressBar progress={progress} variant="inline" animated /> : null}

      <div
        className={cn(
          "grid gap-2",
          showDrawCountdown || showSoldStat ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        <div className="bg-muted/60 flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <span className="bg-primary/15 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
            <Ticket className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Disponibles
            </p>
            <p className="font-semibold tabular-nums" aria-live="polite">
              {formatCount(available)}
            </p>
          </div>
        </div>
        {showDrawCountdown ? (
          <div className="bg-muted/60 flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
            <span className="bg-primary/15 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
              <CalendarDays className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Sorteo en
              </p>
              <p className="font-semibold tabular-nums">
                {daysRemaining! > 0 ? `${daysRemaining} días` : "Hoy"}
              </p>
            </div>
          </div>
        ) : null}
        {showSoldStat ? (
          <div className="bg-muted/60 flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
            <span className="bg-primary/15 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
              <TrendingUp className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Vendidos
              </p>
              <p className="font-semibold tabular-nums" aria-live="polite">
                {progress.percentage.toFixed(1)}%
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card p-1 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2">
          <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
            Precio por boleto
          </p>
          {pricing?.has_global_promotion ? (
            <Badge variant="secondary" className="text-[10px]">
              En promoción
            </Badge>
          ) : pricing?.has_method_promotions ? (
            <Badge variant="outline" className="text-[10px]">
              Promos al pagar
            </Badge>
          ) : null}
        </div>
        {pricing?.promotion?.ends_at ? (
          <p className="text-muted-foreground px-3 pb-1 text-[10px]">
            Termina en{" "}
            <PromotionCountdown endsAt={pricing.promotion.ends_at} compact className="inline" />
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-1 p-1">
          <div
            className={cn(
              "rounded-lg px-3 py-2.5 text-center sm:text-left",
              bsOnPromo ? "bg-emerald-500/10" : "bg-muted/40",
            )}
          >
            <p className="text-muted-foreground text-[10px] font-medium">Bolívares</p>
            {bsOnPromo ? (
              <p className="text-muted-foreground text-xs line-through tabular-nums">
                {formatPrice(baseBs, "Bs")}
              </p>
            ) : null}
            <p
              className={cn(
                "font-heading text-lg font-semibold tabular-nums sm:text-xl",
                bsOnPromo && "text-emerald-700 dark:text-emerald-300",
              )}
            >
              {formatPrice(effectiveBs, "Bs")}
            </p>
          </div>
          <div
            className={cn(
              "rounded-lg px-3 py-2.5 text-center sm:text-left",
              usdOnPromo ? "bg-emerald-500/10" : "bg-muted/40",
            )}
          >
            <p className="text-muted-foreground text-[10px] font-medium">Dólares</p>
            {usdOnPromo ? (
              <p className="text-muted-foreground text-xs line-through tabular-nums">
                {formatPrice(baseUsd, "USD")}
              </p>
            ) : null}
            <p
              className={cn(
                "font-heading text-lg font-semibold tabular-nums sm:text-xl",
                usdOnPromo && "text-emerald-700 dark:text-emerald-300",
              )}
            >
              {formatPrice(effectiveUsd, "USD")}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
