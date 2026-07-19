export type PaymentMethodMinInput = {
  min_tickets?: number | null
  is_active?: boolean
}

/** Lowest quantity that satisfies raffle rules and at least one active payment method. */
export function getStandardMinimumQuantity(
  raffleMin: number,
  methods: PaymentMethodMinInput[],
): number {
  const methodMins = methods
    .filter((m) => m.is_active !== false)
    .map((m) => Math.max(0, m.min_tickets ?? 0))

  if (methodMins.length === 0) return raffleMin
  return Math.max(raffleMin, Math.min(...methodMins))
}

export function isSelloutFlexMode(available: number, standardMin: number): boolean {
  return available > 0 && available < standardMin
}

export function isRaffleMinWaived(available: number, raffleMin: number): boolean {
  return isSelloutFlexMode(available, raffleMin)
}

export function isPaymentMethodMinWaived(
  available: number,
  methodMinTickets: number | null | undefined,
): boolean {
  const min = methodMinTickets ?? 0
  if (min <= 0) return false
  return available > 0 && available < min
}

export type PurchasableQuantityRange = {
  min: number
  max: number
  hasPurchasableQuantity: boolean
  selloutFlex: boolean
}

export function resolvePurchasableQuantityRange(params: {
  raffleMin: number
  raffleMax: number
  available: number
  methods: PaymentMethodMinInput[]
}): PurchasableQuantityRange {
  const standardMin = getStandardMinimumQuantity(params.raffleMin, params.methods)
  const max = Math.min(params.raffleMax, params.available)
  const selloutFlex = isSelloutFlexMode(params.available, standardMin)
  const min = selloutFlex ? 1 : standardMin

  return {
    min,
    max,
    hasPurchasableQuantity: params.available > 0 && max >= min,
    selloutFlex,
  }
}
