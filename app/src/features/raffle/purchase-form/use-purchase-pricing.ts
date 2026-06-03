import { isDollarMethod } from "@raffle/shared/validators"
import { useMemo } from "react"
import { buildMethodPromotionBadgeMap } from "@/features/raffle/promotion-utils"
import type { RaffleForPurchase, RafflePaymentMethod } from "@/features/raffle/types"

type UsePurchasePricingParams = {
  raffle: RaffleForPurchase
  quantity: number
  selectedMethod: RafflePaymentMethod | null
}

export function usePurchasePricing({ raffle, quantity, selectedMethod }: UsePurchasePricingParams) {
  const pricing = raffle.pricing

  const quotesByMethodId = useMemo(() => {
    const map = new Map<number, NonNullable<typeof pricing>["method_quotes"][number]>()
    for (const quote of pricing?.method_quotes ?? []) {
      map.set(quote.raffle_payment_method_id, quote)
    }
    return map
  }, [pricing?.method_quotes])

  const globalEstimate = useMemo(() => {
    const currency: "Bs" | "USD" = "Bs"
    return {
      unitPrice: pricing?.effective_price_bs ?? Number(raffle.price_bs),
      originalUnitPrice: pricing?.price_bs ?? Number(raffle.price_bs),
      discountPerTicket: Math.max(
        0,
        (pricing?.price_bs ?? Number(raffle.price_bs)) -
          (pricing?.effective_price_bs ?? Number(raffle.price_bs)),
      ),
      priceCurrency: currency,
    }
  }, [pricing, raffle.price_bs])

  const methodPricing = useMemo(() => {
    if (!selectedMethod) return null
    const quote = quotesByMethodId.get(selectedMethod.id)
    if (!quote) {
      const isUsd = isDollarMethod(selectedMethod.method_type)
      const unitPrice = isUsd
        ? (pricing?.effective_price_usd ?? Number(raffle.price_usd))
        : (pricing?.effective_price_bs ?? Number(raffle.price_bs))
      const originalUnitPrice = isUsd
        ? (pricing?.price_usd ?? Number(raffle.price_usd))
        : (pricing?.price_bs ?? Number(raffle.price_bs))
      return {
        unitPrice,
        originalUnitPrice,
        discountPerTicket: Math.max(0, originalUnitPrice - unitPrice),
        priceCurrency: isUsd ? ("USD" as const) : ("Bs" as const),
      }
    }
    return {
      unitPrice: quote.final_unit_price,
      originalUnitPrice: quote.original_unit_price,
      discountPerTicket: quote.discount_per_ticket,
      priceCurrency: quote.currency,
    }
  }, [quotesByMethodId, selectedMethod, pricing, raffle.price_bs, raffle.price_usd])

  const unitPrice = methodPricing?.unitPrice ?? globalEstimate.unitPrice
  const originalUnitPrice = methodPricing?.originalUnitPrice ?? globalEstimate.originalUnitPrice
  const discountPerTicket = methodPricing?.discountPerTicket ?? globalEstimate.discountPerTicket
  const priceCurrency = methodPricing?.priceCurrency ?? globalEstimate.priceCurrency
  const priceIsEstimate = selectedMethod == null

  const methodPromotionBadges = useMemo(
    () => buildMethodPromotionBadgeMap(pricing?.method_quotes ?? []),
    [pricing?.method_quotes],
  )

  const methodPromotionHint = useMemo(() => {
    if (!selectedMethod) {
      const hints = (pricing?.method_quotes ?? [])
        .map((q) => q.hint)
        .filter((h): h is string => h != null)
      if (hints.length === 0) return null
      if (hints.length === 1) return hints[0]
      return `Promos por método: ${hints.join(" · ")}`
    }
    const quote = quotesByMethodId.get(selectedMethod.id)
    if (quote?.hint) return quote.hint
    if (discountPerTicket === 0 && (pricing?.has_method_promotions ?? false)) {
      return "Otros métodos tienen promoción exclusiva — mira las etiquetas verdes."
    }
    return null
  }, [
    discountPerTicket,
    pricing?.has_method_promotions,
    pricing?.method_quotes,
    quotesByMethodId,
    selectedMethod,
  ])

  const total = unitPrice * quantity

  return {
    unitPrice,
    originalUnitPrice,
    discountPerTicket,
    priceCurrency,
    priceIsEstimate,
    methodPromotionBadges,
    methodPromotionHint,
    total,
  }
}
