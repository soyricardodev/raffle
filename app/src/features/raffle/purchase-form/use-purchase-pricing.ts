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

  const globalEstimateBs = useMemo(() => {
    const unitPrice = pricing?.effective_price_bs ?? Number(raffle.price_bs)
    const originalUnitPrice = pricing?.price_bs ?? Number(raffle.price_bs)
    return {
      unitPrice,
      originalUnitPrice,
      discountPerTicket: Math.max(0, originalUnitPrice - unitPrice),
    }
  }, [pricing, raffle.price_bs])

  const globalEstimateUsd = useMemo(() => {
    const unitPrice = pricing?.effective_price_usd ?? Number(raffle.price_usd)
    const originalUnitPrice = pricing?.price_usd ?? Number(raffle.price_usd)
    return {
      unitPrice,
      originalUnitPrice,
      discountPerTicket: Math.max(0, originalUnitPrice - unitPrice),
    }
  }, [pricing, raffle.price_usd])

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

  const unitPrice = methodPricing?.unitPrice ?? globalEstimateBs.unitPrice
  const originalUnitPrice = methodPricing?.originalUnitPrice ?? globalEstimateBs.originalUnitPrice
  const discountPerTicket = methodPricing?.discountPerTicket ?? globalEstimateBs.discountPerTicket
  const priceCurrency = methodPricing?.priceCurrency ?? ("Bs" as const)
  const priceIsEstimate = selectedMethod == null

  const methodQuote = selectedMethod ? quotesByMethodId.get(selectedMethod.id) : undefined
  const unitPriceBs =
    methodQuote?.currency === "Bs" ? methodQuote.final_unit_price : globalEstimateBs.unitPrice
  const originalUnitPriceBs =
    methodQuote?.currency === "Bs"
      ? methodQuote.original_unit_price
      : globalEstimateBs.originalUnitPrice
  const discountPerTicketBs =
    methodQuote?.currency === "Bs"
      ? methodQuote.discount_per_ticket
      : globalEstimateBs.discountPerTicket
  const unitPriceUsd =
    methodQuote?.currency === "USD" ? methodQuote.final_unit_price : globalEstimateUsd.unitPrice
  const originalUnitPriceUsd =
    methodQuote?.currency === "USD"
      ? methodQuote.original_unit_price
      : globalEstimateUsd.originalUnitPrice
  const discountPerTicketUsd =
    methodQuote?.currency === "USD"
      ? methodQuote.discount_per_ticket
      : globalEstimateUsd.discountPerTicket

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
  const totalBs = unitPriceBs * quantity
  const totalUsd = unitPriceUsd * quantity

  return {
    unitPrice,
    originalUnitPrice,
    discountPerTicket,
    priceCurrency,
    priceIsEstimate,
    methodPromotionBadges,
    methodPromotionHint,
    total,
    unitPriceBs,
    originalUnitPriceBs,
    discountPerTicketBs,
    totalBs,
    unitPriceUsd,
    originalUnitPriceUsd,
    discountPerTicketUsd,
    totalUsd,
  }
}
