import { VENEZUELA_STATES } from "../validators/index.js"

export const INTERNATIONAL_LABEL = "Internacional"
export const UNKNOWN_LOCATION_LABEL = "Sin ubicación"

export type LocationKind = "venezuela" | "international" | "unknown"

export type ParsedCustomerLocation = {
  kind: LocationKind
  state: string | null
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

const LEGACY_STATE_ALIASES: Record<string, string> = {
  caracas: "Distrito Capital",
  vargas: "La Guaira",
  "dtto capital": "Distrito Capital",
  "distrito capital": "Distrito Capital",
  "la guaira": "La Guaira",
  tachira: "Táchira",
  táchira: "Táchira",
  merida: "Mérida",
  mérida: "Mérida",
  anzoategui: "Anzoátegui",
  anzoátegui: "Anzoátegui",
  falcon: "Falcón",
  falcón: "Falcón",
  "nueva esparta": "Nueva Esparta",
  "delta amacuro": "Delta Amacuro",
}

const STATE_LOOKUP = new Map<string, string>()
for (const state of VENEZUELA_STATES) {
  STATE_LOOKUP.set(state.toLowerCase(), state)
  STATE_LOOKUP.set(stripAccents(state).toLowerCase(), state)
}
for (const [alias, canonical] of Object.entries(LEGACY_STATE_ALIASES)) {
  STATE_LOOKUP.set(alias.toLowerCase(), canonical)
  STATE_LOOKUP.set(stripAccents(alias).toLowerCase(), canonical)
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "")
}

export function parseCustomerLocation(location: string | null | undefined): ParsedCustomerLocation {
  const raw = location?.trim() || null
  if (!raw) {
    return { kind: "unknown", state: null, raw: null }
  }

  const lower = raw.toLowerCase()
  if (lower.startsWith("venezuela,")) {
    const statePart = raw.slice("venezuela,".length).trim()
    return {
      kind: "venezuela",
      state: normalizeVenezuelaState(statePart),
      raw,
    }
  }

  const direct = normalizeVenezuelaState(raw)
  if (direct) {
    return { kind: "venezuela", state: direct, raw }
  }

  return { kind: "international", state: null, raw }
}

export function normalizeVenezuelaState(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  const key = trimmed.toLowerCase()
  const accentKey = stripAccents(trimmed).toLowerCase()
  return STATE_LOOKUP.get(key) ?? STATE_LOOKUP.get(accentKey) ?? null
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
