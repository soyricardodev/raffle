import {
  getStandardMinimumQuantity,
  resolvePurchasableQuantityRange as resolveSharedPurchasableQuantityRange,
} from "@raffle/shared/purchase/quantity-policy"
import type { RafflePaymentMethod } from "@/features/raffle/types"

export type QuickPickOption = {
  value: number
  label: string
}

export type PurchasableQuantityRange = {
  min: number
  max: number
  hasPurchasableQuantity: boolean
  selloutFlex: boolean
}

export function clampQuantity(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.floor(value)))
}

/** Lowest quantity that satisfies raffle rules and at least one active payment method. */
export function getMinimumPurchasableQuantity(
  raffleMin: number,
  methods: Pick<RafflePaymentMethod, "min_tickets" | "is_active">[],
): number {
  return getStandardMinimumQuantity(raffleMin, methods)
}

export function getPaymentMethodThresholds(
  methods: Pick<RafflePaymentMethod, "min_tickets" | "is_active">[],
): number[] {
  const values = methods
    .filter((m) => m.is_active !== false)
    .map((m) => m.min_tickets ?? 0)
    .filter((n) => n > 0)
  return [...new Set(values)].sort((a, b) => a - b)
}

export function getPurchasableQuantityRange(
  raffleMin: number,
  raffleMax: number,
  available: number,
  methods: Pick<RafflePaymentMethod, "min_tickets" | "is_active">[],
): PurchasableQuantityRange {
  return resolveSharedPurchasableQuantityRange({
    raffleMin,
    raffleMax,
    available,
    methods,
  })
}

export function formatQuickPickLabel(value: number, max: number): string {
  if (value === max && max >= 100) return "Máx"
  return String(value)
}

function collectCandidateValues(min: number, max: number, paymentThresholds: number[]): number[] {
  const candidates = new Set<number>([min, max])

  for (const threshold of paymentThresholds) {
    if (threshold >= min && threshold <= max) candidates.add(threshold)
  }

  const span = max - min
  for (const step of [2, 3, 5, 10, 15, 20, 25, 50, 100, 250, 500]) {
    if (step >= min && step <= max) candidates.add(step)
  }

  if (span >= 3) {
    candidates.add(Math.round(min + span / 2))
  }
  if (span >= 12) {
    for (const fraction of [0.25, 0.5, 0.75]) {
      candidates.add(Math.min(max, Math.round(min + span * fraction)))
    }
  }

  return [...candidates].sort((a, b) => a - b)
}

function pickSpacedValues(
  sorted: number[],
  min: number,
  max: number,
  limit: number,
  priorityValues: number[],
): number[] {
  const chosen = new Set<number>([min])
  if (max !== min) chosen.add(max)

  for (const value of priorityValues) {
    if (chosen.size >= limit) break
    if (value >= min && value <= max) chosen.add(value)
  }

  const pool = sorted.filter((n) => !chosen.has(n))
  const slotsLeft = limit - chosen.size
  if (slotsLeft > 0 && pool.length > 0) {
    for (let i = 1; i <= slotsLeft; i++) {
      const idx = Math.min(
        pool.length - 1,
        Math.max(0, Math.round((i * pool.length) / (slotsLeft + 1)) - 1),
      )
      chosen.add(pool[idx]!)
    }
  }

  return [...chosen].sort((a, b) => a - b)
}

/** Up to `maxChips` useful presets between min and max (mobile-friendly). */
export function buildSmartQuickPicks(
  min: number,
  max: number,
  options?: {
    paymentThresholds?: number[]
    maxChips?: number
  },
): QuickPickOption[] {
  const maxChips = options?.maxChips ?? 6
  if (min > max) return []
  if (min === max) {
    return [{ value: min, label: formatQuickPickLabel(min, max) }]
  }

  const paymentThresholds = options?.paymentThresholds ?? []
  const sorted = collectCandidateValues(min, max, paymentThresholds)
  const values = pickSpacedValues(sorted, min, max, maxChips, paymentThresholds)

  return values.map((value) => ({
    value,
    label: formatQuickPickLabel(value, max),
  }))
}
