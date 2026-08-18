import { normalizeMunicipality } from "../geo/venezuela-municipalities.js"
import { normalizeVenezuelaState, splitVenezuelaLocation } from "../validators/index.js"

export { normalizeVenezuelaState }

export const INTERNATIONAL_LABEL = "Internacional"
export const UNKNOWN_LOCATION_LABEL = "Sin ubicación"

export type LocationKind = "venezuela" | "international" | "unknown"

export type ParsedCustomerLocation = {
  kind: LocationKind
  state: string | null
  municipality: string | null
  raw: string | null
}

export type LocationMetricRow = {
  location: string | null
  count: number
  revenueCents: number
}

export type LocationAggregateRow = {
  label: string
  count: number
  revenue: number
}

export function parseCustomerLocation(location: string | null | undefined): ParsedCustomerLocation {
  const raw = location?.trim() || null
  if (!raw) {
    return { kind: "unknown", state: null, municipality: null, raw: null }
  }

  const split = splitVenezuelaLocation(raw)
  if (split) {
    const state = normalizeVenezuelaState(split.statePart)
    const municipality =
      state && split.municipalityPart
        ? normalizeMunicipality(state, split.municipalityPart)
        : null
    return { kind: "venezuela", state, municipality, raw }
  }

  const direct = normalizeVenezuelaState(raw)
  if (direct) {
    return { kind: "venezuela", state: direct, municipality: null, raw }
  }

  return { kind: "international", state: null, municipality: null, raw }
}

export function classifyLocationForAnalytics(location: string | null | undefined): string {
  const parsed = parseCustomerLocation(location)
  if (parsed.kind === "unknown") return UNKNOWN_LOCATION_LABEL
  if (parsed.kind === "international") return INTERNATIONAL_LABEL
  return parsed.state ?? UNKNOWN_LOCATION_LABEL
}

export function aggregateLocationMetrics(
  rows: LocationMetricRow[],
  fromCents: (cents: number) => number,
): {
  byState: LocationAggregateRow[]
  mix: LocationAggregateRow[]
} {
  const byStateMap = new Map<string, { count: number; revenueCents: number }>()
  const mixMap = new Map<string, { count: number; revenueCents: number }>()

  for (const row of rows) {
    const parsed = parseCustomerLocation(row.location)
    const mixLabel =
      parsed.kind === "venezuela"
        ? "Venezuela"
        : parsed.kind === "international"
          ? INTERNATIONAL_LABEL
          : UNKNOWN_LOCATION_LABEL
    const stateLabel = classifyLocationForAnalytics(row.location)

    bump(byStateMap, stateLabel, row.count, row.revenueCents)
    bump(mixMap, mixLabel, row.count, row.revenueCents)
  }

  return {
    byState: toSortedRows(byStateMap, fromCents),
    mix: toSortedRows(mixMap, fromCents),
  }
}

function bump(
  map: Map<string, { count: number; revenueCents: number }>,
  label: string,
  count: number,
  revenueCents: number,
) {
  const current = map.get(label) ?? { count: 0, revenueCents: 0 }
  map.set(label, {
    count: current.count + count,
    revenueCents: current.revenueCents + revenueCents,
  })
}

function toSortedRows(
  map: Map<string, { count: number; revenueCents: number }>,
  fromCents: (cents: number) => number,
): LocationAggregateRow[] {
  return [...map.entries()]
    .map(([label, value]) => ({
      label,
      count: value.count,
      revenue: fromCents(value.revenueCents),
    }))
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
}
