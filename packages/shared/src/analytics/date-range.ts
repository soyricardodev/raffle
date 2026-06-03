export type AnalyticsDateRange =
  | { mode: "days"; days: number }
  | { mode: "range"; fromMs: number; toMs: number }
  | { mode: "all" }

export type AnalyticsPeriodState =
  | { kind: "preset"; days: number }
  | { kind: "custom"; from: string; to: string }

export const ANALYTICS_PERIOD_PRESETS = [
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
  { label: "180 días", days: 180 },
  { label: "365 días", days: 365 },
  { label: "Todo", days: 0 },
] as const

const MAX_CUSTOM_RANGE_DAYS = 730

export function endOfDayMs(date: Date): number {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy.getTime()
}

export function startOfDayMs(date: Date): number {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy.getTime()
}

function parseYmdLocal(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number)
  return new Date(year!, month! - 1, day)
}

function formatDateYmd(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function periodStateToDateRange(period: AnalyticsPeriodState): AnalyticsDateRange {
  if (period.kind === "custom") {
    const fromMs = startOfDayMs(parseYmdLocal(period.from))
    const toMs = endOfDayMs(parseYmdLocal(period.to))
    return { mode: "range", fromMs, toMs }
  }
  if (period.days <= 0) return { mode: "all" }
  return { mode: "days", days: period.days }
}

/** Calendar bounds for purchases list API (`start` / `end` date columns). */
export function dateRangeToPurchaseDateBounds(
  range: AnalyticsDateRange,
): { start?: string; end?: string } {
  if (range.mode === "all") return {}

  if (range.mode === "range") {
    return {
      start: formatDateYmd(new Date(range.fromMs)),
      end: formatDateYmd(new Date(range.toMs)),
    }
  }

  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - range.days)
  return { start: formatDateYmd(start), end: formatDateYmd(end) }
}

export function parseAnalyticsDateRange(searchParams: URLSearchParams): AnalyticsDateRange {
  if (searchParams.get("all") === "true") {
    return { mode: "all" }
  }

  const fromRaw = searchParams.get("from")
  const toRaw = searchParams.get("to")
  if (fromRaw && toRaw) {
    const fromMs = startOfDayMs(parseYmdLocal(fromRaw))
    const toMs = endOfDayMs(parseYmdLocal(toRaw))
    if (!Number.isNaN(fromMs) && !Number.isNaN(toMs) && fromMs <= toMs) {
      const spanDays = Math.ceil((toMs - fromMs) / (24 * 60 * 60 * 1000))
      if (spanDays <= MAX_CUSTOM_RANGE_DAYS) {
        return { mode: "range", fromMs, toMs }
      }
    }
  }

  const days = Number(searchParams.get("days") || 30)
  if (days <= 0) {
    return { mode: "all" }
  }

  return { mode: "days", days: Math.min(Math.max(Math.floor(days), 1), MAX_CUSTOM_RANGE_DAYS) }
}

export function getPreviousPeriod(range: AnalyticsDateRange): AnalyticsDateRange | null {
  if (range.mode === "all") return null

  if (range.mode === "days") {
    return { mode: "days", days: range.days * 2 }
  }

  const spanMs = range.toMs - range.fromMs
  return {
    mode: "range",
    fromMs: range.fromMs - spanMs - 1,
    toMs: range.fromMs - 1,
  }
}

export function describeAnalyticsRange(range: AnalyticsDateRange): string {
  if (range.mode === "all") return "Todo el historial"
  if (range.mode === "days") return `${range.days} días`
  const from = new Date(range.fromMs).toISOString().slice(0, 10)
  const to = new Date(range.toMs).toISOString().slice(0, 10)
  return `${from} — ${to}`
}

export function periodLabel(period: AnalyticsPeriodState): string {
  return describeAnalyticsRange(periodStateToDateRange(period))
}

export function analyticsRangeToSearchParams(
  range: AnalyticsDateRange,
  raffleId?: string,
): URLSearchParams {
  const params = new URLSearchParams()
  if (raffleId) params.set("raffleId", raffleId)

  if (range.mode === "all") {
    params.set("all", "true")
    return params
  }

  if (range.mode === "range") {
    params.set("from", formatDateYmd(new Date(range.fromMs)))
    params.set("to", formatDateYmd(new Date(range.toMs)))
    return params
  }

  params.set("days", String(range.days))
  return params
}

export function periodStateToSearchParams(
  period: AnalyticsPeriodState,
  raffleId?: string,
): URLSearchParams {
  return analyticsRangeToSearchParams(periodStateToDateRange(period), raffleId)
}

export function explorePurchasesSearchParams(
  period: AnalyticsPeriodState,
  options: {
    raffleId?: string
    page?: number
    limit?: number
    status?: string
  } = {},
): URLSearchParams {
  const params = new URLSearchParams()
  const bounds = dateRangeToPurchaseDateBounds(periodStateToDateRange(period))

  if (bounds.start) params.set("start", bounds.start)
  if (bounds.end) params.set("end", bounds.end)
  if (options.raffleId) params.set("raffle_id", options.raffleId)
  if (options.page != null) params.set("page", String(options.page))
  if (options.limit != null) params.set("limit", String(options.limit))
  if (options.status) params.set("status", options.status)

  return params
}
