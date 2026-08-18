import { CreateRafflePromotionInput } from "@raffle/shared/validators"
import { addDays, startOfDay } from "date-fns"
import type { RafflePricing, RafflePromotionApi } from "@/features/raffle/promotion-types"
import { datetimeLocalToIso, formatDatetimeLocal, isoToDatetimeLocal } from "@/lib/date-input"

export const PERCENT_CHIPS = [10, 15, 20, 25] as const

export type PromoScheduleStatus = "active" | "scheduled" | "expired" | "inactive"
export type PromoDurationMode = "permanent" | "24h" | "weekend" | "custom"
export type PromoKind = "fixed_price" | "percentage"
export type PromoScope = "all_methods" | "payment_method"
export type DiscountChip = "10" | "15" | "20" | "25" | "custom_percent" | "fixed"

export type PromoFormState = {
  name: string
  description: string
  is_active: boolean
  kind: PromoKind
  scope: PromoScope
  raffle_payment_method_id: string
  promo_price_bs: string
  promo_price_usd: string
  discount_percent: string
  duration_mode: PromoDurationMode
  starts_at: string
  ends_at: string
}

export type PaymentMethodOption = {
  id: number
  label: string
}

export type PricePreview = {
  bs: { from: number; to: number } | null
  usd: { from: number; to: number } | null
}

export type PromotionSummary = {
  hasActive: boolean
  title: string
  priceHint: string
}

export function formatPromoAmount(value: number): string {
  if (!Number.isFinite(value)) return "—"
  const cents = Math.round(value * 100)
  if (cents % 100 === 0) return String(cents / 100)
  return (cents / 100).toFixed(2)
}

export function formatPromoPercent(value: number): string {
  if (!Number.isFinite(value)) return ""
  const cents = Math.round(value * 100)
  if (cents % 100 === 0) return String(cents / 100)
  return String(value)
}

export function suggestedPromotionName(input: {
  kind: PromoKind
  discountPercent: string
  promoPriceBs: string
  promoPriceUsd: string
  scope: PromoScope
  methodLabel?: string | null
}): string {
  const methodSuffix =
    input.scope === "payment_method" && input.methodLabel?.trim()
      ? ` en ${input.methodLabel.trim()}`
      : ""

  if (input.kind === "percentage") {
    const pct = Number(input.discountPercent)
    const pctLabel = Number.isFinite(pct) && pct > 0 ? formatPromoPercent(pct) : null
    if (!pctLabel) return methodSuffix ? `Descuento${methodSuffix}` : "Descuento"
    return `${pctLabel}% de descuento${methodSuffix}`
  }

  const bs = Number(input.promoPriceBs)
  const usd = Number(input.promoPriceUsd)
  const hasBs = Boolean(input.promoPriceBs.trim()) && Number.isFinite(bs) && bs > 0
  const hasUsd = Boolean(input.promoPriceUsd.trim()) && Number.isFinite(usd) && usd > 0
  if (hasBs) return `Precio promo Bs ${formatPromoAmount(bs)}${methodSuffix}`
  if (hasUsd) return `Precio promo $${formatPromoAmount(usd)}${methodSuffix}`
  return methodSuffix ? `Precio promo${methodSuffix}` : "Precio promo"
}

export function withSuggestedName(
  form: PromoFormState,
  methodLabel: string | null,
  nameTouched: boolean,
): PromoFormState {
  if (nameTouched) return form
  return {
    ...form,
    name: suggestedPromotionName({
      kind: form.kind,
      discountPercent: form.discount_percent,
      promoPriceBs: form.promo_price_bs,
      promoPriceUsd: form.promo_price_usd,
      scope: form.scope,
      methodLabel,
    }),
  }
}

export function defaultPromoForm(): PromoFormState {
  return {
    name: suggestedPromotionName({
      kind: "fixed_price",
      discountPercent: "",
      promoPriceBs: "",
      promoPriceUsd: "",
      scope: "all_methods",
      methodLabel: null,
    }),
    description: "",
    is_active: true,
    kind: "fixed_price",
    scope: "all_methods",
    raffle_payment_method_id: "",
    promo_price_bs: "",
    promo_price_usd: "",
    discount_percent: "",
    duration_mode: "permanent",
    starts_at: "",
    ends_at: "",
  }
}

export function formFromPromotion(promo: RafflePromotionApi): PromoFormState {
  const hasSchedule = Boolean(promo.starts_at || promo.ends_at)
  return {
    name: promo.name,
    description: promo.description ?? "",
    is_active: promo.is_active,
    kind: promo.kind,
    scope: promo.scope,
    raffle_payment_method_id: promo.raffle_payment_method_id
      ? String(promo.raffle_payment_method_id)
      : "",
    promo_price_bs: promo.promo_price_bs != null ? String(promo.promo_price_bs) : "",
    promo_price_usd: promo.promo_price_usd != null ? String(promo.promo_price_usd) : "",
    discount_percent: promo.discount_percent != null ? String(promo.discount_percent) : "",
    duration_mode: hasSchedule ? "custom" : "permanent",
    starts_at: promo.starts_at ? isoToDatetimeLocal(promo.starts_at) : "",
    ends_at: promo.ends_at ? isoToDatetimeLocal(promo.ends_at) : "",
  }
}

export function durationRange(
  preset: "24h" | "weekend",
  now: Date = new Date(),
): { starts_at: string; ends_at: string } {
  if (preset === "24h") {
    const start = new Date(now)
    start.setSeconds(0, 0)
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    return {
      starts_at: formatDatetimeLocal(start),
      ends_at: formatDatetimeLocal(end),
    }
  }

  const day = now.getDay()
  let daysToFriday: number
  if (day === 0) daysToFriday = -2
  else if (day === 6) daysToFriday = -1
  else if (day === 5) daysToFriday = 0
  else daysToFriday = 5 - day

  const friday = startOfDay(addDays(now, daysToFriday))
  const sundayEnd = addDays(friday, 2)
  sundayEnd.setHours(23, 59, 0, 0)
  return {
    starts_at: formatDatetimeLocal(friday),
    ends_at: formatDatetimeLocal(sundayEnd),
  }
}

export function applyDurationPreset(
  preset: PromoDurationMode,
  now: Date = new Date(),
  current?: Pick<PromoFormState, "starts_at" | "ends_at">,
): Pick<PromoFormState, "duration_mode" | "starts_at" | "ends_at"> {
  if (preset === "permanent") {
    return { duration_mode: "permanent", starts_at: "", ends_at: "" }
  }
  if (preset === "custom") {
    return {
      duration_mode: "custom",
      starts_at: current?.starts_at ?? "",
      ends_at: current?.ends_at ?? "",
    }
  }
  return { duration_mode: preset, ...durationRange(preset, now) }
}

export function discountChipFromForm(
  form: Pick<PromoFormState, "kind" | "discount_percent">,
): DiscountChip {
  if (form.kind === "fixed_price") return "fixed"
  const n = Number(form.discount_percent)
  if (n === 10) return "10"
  if (n === 15) return "15"
  if (n === 20) return "20"
  if (n === 25) return "25"
  return "custom_percent"
}

export function applyDiscountChip(chip: DiscountChip, current: PromoFormState): PromoFormState {
  if (chip === "fixed") {
    return { ...current, kind: "fixed_price", discount_percent: "" }
  }
  if (chip === "custom_percent") {
    const n = Number(current.discount_percent)
    const isPreset = n === 10 || n === 15 || n === 20 || n === 25
    return {
      ...current,
      kind: "percentage",
      discount_percent: isPreset ? "" : current.discount_percent,
    }
  }
  return { ...current, kind: "percentage", discount_percent: chip }
}

export function discountedPrice(base: number, percent: number): number | null {
  if (!Number.isFinite(base) || !Number.isFinite(percent) || percent <= 0 || percent >= 100) {
    return null
  }
  const baseCents = Math.round(base * 100)
  const bps = Math.round(percent * 100)
  const discounted = Math.round((baseCents * (10_000 - bps)) / 10_000)
  if (discounted >= baseCents || discounted < 0) return null
  return discounted / 100
}

export function previewPromoPrices(
  form: Pick<PromoFormState, "kind" | "discount_percent" | "promo_price_bs" | "promo_price_usd">,
  baseBs: number,
  baseUsd: number,
): PricePreview {
  if (form.kind === "percentage") {
    const pct = Number(form.discount_percent)
    const toBs = discountedPrice(baseBs, pct)
    const toUsd = discountedPrice(baseUsd, pct)
    return {
      bs: toBs != null ? { from: baseBs, to: toBs } : null,
      usd: toUsd != null ? { from: baseUsd, to: toUsd } : null,
    }
  }
  const bs = Number(form.promo_price_bs)
  const usd = Number(form.promo_price_usd)
  return {
    bs:
      form.promo_price_bs.trim() && Number.isFinite(bs) && bs > 0 ? { from: baseBs, to: bs } : null,
    usd:
      form.promo_price_usd.trim() && Number.isFinite(usd) && usd > 0
        ? { from: baseUsd, to: usd }
        : null,
  }
}

export function previewFromApiPromo(
  promo: RafflePromotionApi,
  baseBs: number,
  baseUsd: number,
): PricePreview {
  return previewPromoPrices(
    {
      kind: promo.kind,
      discount_percent: promo.discount_percent != null ? String(promo.discount_percent) : "",
      promo_price_bs: promo.promo_price_bs != null ? String(promo.promo_price_bs) : "",
      promo_price_usd: promo.promo_price_usd != null ? String(promo.promo_price_usd) : "",
    },
    baseBs,
    baseUsd,
  )
}

export function formatPriceShiftLine(preview: PricePreview): string {
  const parts: string[] = []
  if (preview.bs) {
    parts.push(`Bs ${formatPromoAmount(preview.bs.from)} → ${formatPromoAmount(preview.bs.to)}`)
  }
  if (preview.usd) {
    parts.push(`$${formatPromoAmount(preview.usd.from)} → ${formatPromoAmount(preview.usd.to)}`)
  }
  return parts.join(" · ")
}

export function formatPromoScopeLabel(
  promo: Pick<RafflePromotionApi, "scope" | "raffle_payment_method_id">,
  methods: PaymentMethodOption[],
): string {
  if (promo.scope === "all_methods") return "Todos"
  const method = methods.find((m) => m.id === promo.raffle_payment_method_id)
  return method?.label ?? "Por método"
}

export function formatPromoEndsHint(endsAt: string | null): string {
  if (!endsAt) return "sin fecha fin"
  return `hasta ${new Date(endsAt).toLocaleString("es-VE")}`
}

export function formatPromoListDetail(
  promo: RafflePromotionApi,
  methods: PaymentMethodOption[],
): string {
  const scope = formatPromoScopeLabel(promo, methods)
  const kind =
    promo.kind === "percentage" && promo.discount_percent != null
      ? `${formatPromoPercent(promo.discount_percent)}%`
      : "Precio fijo"
  return `${kind} · ${scope} · ${formatPromoEndsHint(promo.ends_at)}`
}

export function buildPromoPayload(state: PromoFormState) {
  const scheduled = state.duration_mode !== "permanent"
  return {
    name: state.name.trim(),
    description: state.description.trim() || null,
    is_active: state.is_active,
    kind: state.kind,
    scope: state.scope,
    raffle_payment_method_id:
      state.scope === "payment_method" && state.raffle_payment_method_id
        ? Number(state.raffle_payment_method_id)
        : null,
    promo_price_bs:
      state.kind === "fixed_price" && state.promo_price_bs.trim()
        ? Number(state.promo_price_bs)
        : null,
    promo_price_usd:
      state.kind === "fixed_price" && state.promo_price_usd.trim()
        ? Number(state.promo_price_usd)
        : null,
    discount_percent:
      state.kind === "percentage" && state.discount_percent.trim()
        ? Number(state.discount_percent)
        : null,
    starts_at: scheduled && state.starts_at ? datetimeLocalToIso(state.starts_at) : null,
    ends_at: scheduled && state.ends_at ? datetimeLocalToIso(state.ends_at) : null,
  }
}

export function fieldErrorsFromPromoPayload(
  payload: ReturnType<typeof buildPromoPayload>,
): Record<string, string> {
  const parsed = CreateRafflePromotionInput.safeParse(payload)
  if (parsed.success) return {}
  const next: Record<string, string> = {}
  for (const [key, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
    if (messages?.[0]) next[key] = messages[0]
  }
  return next
}

export function promoStatusLabel(status: PromoScheduleStatus): string {
  switch (status) {
    case "active":
      return "Activa"
    case "scheduled":
      return "Programada"
    case "expired":
      return "Vencida"
    case "inactive":
      return "Inactiva"
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function promoStatusVariant(
  status: PromoScheduleStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active":
      return "default"
    case "scheduled":
      return "secondary"
    case "expired":
      return "outline"
    case "inactive":
      return "destructive"
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function summarizeActivePromotion(
  pricing: RafflePricing,
  baseBs: number,
  baseUsd: number,
): PromotionSummary {
  if (!pricing.has_active_promotion) {
    return {
      hasActive: false,
      title: "Sin promoción activa",
      priceHint: "Aplica un descuento sin cambiar el precio base.",
    }
  }

  if (pricing.has_global_promotion && pricing.promotion) {
    const pct = pricing.promotion.discount_percent
    return {
      hasActive: true,
      title: pct != null ? `${formatPromoPercent(pct)}% de descuento` : pricing.promotion.name,
      priceHint: formatPriceShiftLine({
        bs: { from: baseBs, to: pricing.effective_price_bs },
        usd: { from: baseUsd, to: pricing.effective_price_usd },
      }),
    }
  }

  const first = pricing.method_promotions[0]
  return {
    hasActive: true,
    title: first?.name ?? "Promoción por método",
    priceHint: "Descuento en métodos de pago específicos",
  }
}

export function methodLabelForForm(
  form: Pick<PromoFormState, "scope" | "raffle_payment_method_id">,
  methods: PaymentMethodOption[],
): string | null {
  if (form.scope !== "payment_method") return null
  return methods.find((m) => String(m.id) === form.raffle_payment_method_id)?.label ?? null
}
