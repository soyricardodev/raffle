import { Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PromotionCountdown } from "@/features/raffle/PromotionCountdown"
import type { MethodPromotionSummary, RafflePricing } from "@/features/raffle/promotion-types"
import { formatMethodPromotionHint } from "@/features/raffle/promotion-utils"
import type { RafflePaymentMethod } from "@/features/raffle/types"
import { cn } from "@/lib/utils"

type PromotionBannerProps = {
  pricing: RafflePricing
  paymentMethods?: RafflePaymentMethod[]
  className?: string
}

function GlobalPromotionBanner({
  promo,
  className,
}: {
  promo: NonNullable<RafflePricing["promotion"]>
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3",
        className,
      )}
      data-testid="promotion-banner-global"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
          <Tag className="mr-1 size-3" aria-hidden />
          Promoción activa
        </Badge>
        <span className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">
          {promo.name}
        </span>
      </div>
      {promo.description ? (
        <p className="text-muted-foreground text-xs leading-relaxed">{promo.description}</p>
      ) : null}
      <p className="text-xs font-medium text-emerald-900 dark:text-emerald-100">
        ¡Aprovecha antes de que termine!
        {promo.discount_percent != null ? (
          <span className="ml-1 tabular-nums">Hasta {promo.discount_percent}% de descuento</span>
        ) : null}
      </p>
      {promo.ends_at ? (
        <PromotionCountdown
          endsAt={promo.ends_at}
          className="text-sm text-emerald-900 dark:text-emerald-100"
        />
      ) : (
        <p className="text-muted-foreground text-xs">Oferta por tiempo limitado</p>
      )}
    </div>
  )
}

function MethodPromotionsBanner({
  methodPromotions,
  paymentMethods,
  className,
}: {
  methodPromotions: MethodPromotionSummary[]
  paymentMethods: RafflePaymentMethod[]
  className?: string
}) {
  const soonestEnd = methodPromotions
    .map((p) => p.ends_at)
    .filter((d): d is string => d != null)
    .sort()[0]

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3",
        className,
      )}
      data-testid="promotion-banner-method"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-sky-600 text-white hover:bg-sky-600">
          <Tag className="mr-1 size-3" aria-hidden />
          Promo por método de pago
        </Badge>
      </div>
      <p className="text-xs font-medium text-sky-950 dark:text-sky-50">
        El descuento aplica solo si pagas con el método indicado:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {methodPromotions.map((promo) => {
          const method = paymentMethods.find((m) => m.id === promo.raffle_payment_method_id)
          if (!method) return null
          return (
            <Badge
              key={promo.raffle_payment_method_id}
              variant="secondary"
              className="bg-sky-500/15 text-sky-900 dark:text-sky-100"
            >
              {formatMethodPromotionHint(promo, method)}
            </Badge>
          )
        })}
      </div>
      {soonestEnd ? (
        <p className="text-xs text-sky-900 dark:text-sky-100">
          Termina en{" "}
          <PromotionCountdown endsAt={soonestEnd} compact className="inline font-semibold" />
        </p>
      ) : null}
    </div>
  )
}

export function PromotionBanner({
  pricing,
  paymentMethods = [],
  className,
}: PromotionBannerProps) {
  if (!pricing.has_global_promotion && !pricing.has_method_promotions) return null

  const globalPromo =
    pricing.promotion?.scope === "all_methods" ? pricing.promotion : null
  const methodPromos = pricing.method_promotions

  const showGlobal = globalPromo != null
  const showMethod =
    methodPromos.length > 0 && paymentMethods.length > 0

  if (!showGlobal && !showMethod) return null

  return (
    <div className={cn("flex flex-col gap-2", className)} data-testid="promotion-banner">
      {showGlobal ? <GlobalPromotionBanner promo={globalPromo} /> : null}
      {showMethod ? (
        <MethodPromotionsBanner
          methodPromotions={methodPromos}
          paymentMethods={paymentMethods}
        />
      ) : null}
      {showGlobal && showMethod ? (
        <p className="text-muted-foreground px-1 text-[11px] leading-snug">
          También hay promociones adicionales en métodos de pago específicos (míralas al elegir
          cómo pagar).
        </p>
      ) : null}
    </div>
  )
}
