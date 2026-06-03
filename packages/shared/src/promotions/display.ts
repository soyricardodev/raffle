import { paymentMethodDisplayLabel } from "../payment-methods/display.js"
import { isDollarMethodType } from "../payment-methods/definitions.js"
import type { PaymentMethod } from "../payment-methods/types.js"
import type { PromotionKind } from "./types.js"

export type MethodPromotionDisplay = {
  discount_percent: number | null
  promo_price_bs: number | null
  promo_price_usd: number | null
}

export type PaymentMethodDisplayRef = {
  method_type: PaymentMethod
  label?: string
}

/** Badge corto en la fila del método (ej. "-20%"). */
export function formatMethodPromotionBadge(promo: MethodPromotionDisplay): string {
  if (promo.discount_percent != null) {
    const rounded =
      promo.discount_percent % 1 === 0
        ? String(Math.round(promo.discount_percent))
        : promo.discount_percent.toFixed(1)
    return `-${rounded}%`
  }
  return "Oferta"
}

/** Texto descriptivo junto al método (ej. "20% pagando con Zelle"). */
export function formatMethodPromotionHint(
  promo: MethodPromotionDisplay,
  method: PaymentMethodDisplayRef,
): string {
  const methodName = paymentMethodDisplayLabel(method)
  if (promo.discount_percent != null) {
    const rounded =
      promo.discount_percent % 1 === 0
        ? String(Math.round(promo.discount_percent))
        : promo.discount_percent.toFixed(1)
    return `${rounded}% pagando con ${methodName}`
  }
  const price = isDollarMethodType(method.method_type)
    ? promo.promo_price_usd
    : promo.promo_price_bs
  if (price != null) {
    const formatted = price.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    const suffix = isDollarMethodType(method.method_type) ? `$ ${formatted}` : `Bs ${formatted}`
    return `Precio promo ${suffix} con ${methodName}`
  }
  return `Promo con ${methodName}`
}

export function promotionKindLabel(kind: PromotionKind): string {
  return kind === "fixed_price" ? "Precio fijo" : "Porcentaje"
}
