import { getFieldsForType } from "./definitions.js"
import { paymentMethodTypeLabel, summarizeAccountInfo } from "./display.js"
import { normalizeAccountInfoKeys, stableAccountInfoKey } from "./normalize.js"
import type { PaymentMethod } from "./types.js"

export type PaymentAccountCache = Map<string, number>

const LEGACY_MIGRATION_LABEL_RE = /^(pago_movil|zinli|zelle|binance|bs|usd)\s+#(\d+)$/i

export function parseLegacyPaymentMethodId(label: string): number | null {
  const match = LEGACY_MIGRATION_LABEL_RE.exec(label)
  return match ? Number(match[2]) : null
}

export function isLegacyMigrationLabel(label: string): boolean {
  return LEGACY_MIGRATION_LABEL_RE.test(label)
}

export function parseRawAccountInfo(value: unknown): Record<string, string> {
  let obj: unknown = value
  if (typeof value === "string") {
    try {
      obj = JSON.parse(value)
    } catch {
      return {}
    }
  }
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return {}
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v).trim()])
      .filter(([, v]) => v !== ""),
  )
}

/** Normalize legacy account_info JSON into canonical keys (incl. pago_movil cedula split). */
export function normalizeLegacyAccountInfo(
  methodType: PaymentMethod,
  raw: unknown,
): Record<string, string> {
  const info = parseRawAccountInfo(raw)
  return normalizeAccountInfoKeys(methodType, info)
}

export function buildPaymentAccountLabel(
  methodType: PaymentMethod,
  info: Record<string, string>,
): string {
  const summary = summarizeAccountInfo(methodType, info)
  if (summary === "—") return paymentMethodTypeLabel(methodType)
  return summary
}

export async function resolveOrCreatePaymentAccount(
  cache: PaymentAccountCache,
  methodType: PaymentMethod,
  rawInfo: unknown,
  createAccount: (normalized: Record<string, string>, label: string) => Promise<number>,
): Promise<{ accountId: number; created: boolean }> {
  const normalized = normalizeLegacyAccountInfo(methodType, rawInfo)
  const cacheKey = stableAccountInfoKey(methodType, normalized)
  const existing = cache.get(cacheKey)
  if (existing !== undefined) {
    return { accountId: existing, created: false }
  }

  const label = buildPaymentAccountLabel(methodType, normalized)
  const accountId = await createAccount(normalized, label)
  cache.set(cacheKey, accountId)
  return { accountId, created: true }
}

export function mergeMinTickets(a: number | null, b: number | null): number | null {
  if (a == null) return b
  if (b == null) return a
  return Math.min(a, b)
}

export function rafflePaymentMethodCacheKey(raffleId: number, accountId: number): string {
  return `${raffleId}:${accountId}`
}

export type CachedRafflePaymentMethod = {
  rpmId: number
  minTickets: number | null
  isActive: boolean
}

export type RafflePaymentMethodCache = Map<string, CachedRafflePaymentMethod>

export async function resolveOrCreateRafflePaymentMethod(
  cache: RafflePaymentMethodCache,
  raffleId: number,
  accountId: number,
  assignment: { isActive: boolean; minTickets: number | null },
  createRpm: (assignment: { isActive: boolean; minTickets: number | null }) => Promise<number>,
  updateRpm?: (rpmId: number, patch: { minTickets: number | null }) => Promise<void>,
): Promise<{ rpmId: number; created: boolean }> {
  const key = rafflePaymentMethodCacheKey(raffleId, accountId)
  const existing = cache.get(key)
  if (existing) {
    const minTickets = mergeMinTickets(existing.minTickets, assignment.minTickets)
    if (minTickets !== existing.minTickets && updateRpm) {
      await updateRpm(existing.rpmId, { minTickets })
      existing.minTickets = minTickets
    }
    return { rpmId: existing.rpmId, created: false }
  }

  const rpmId = await createRpm(assignment)
  cache.set(key, {
    rpmId,
    minTickets: assignment.minTickets,
    isActive: assignment.isActive,
  })
  return { rpmId, created: true }
}

/** Score canonical fields present (method-aware). */
export function accountInfoCompletenessScore(
  methodType: PaymentMethod,
  info: Record<string, string>,
): number {
  return getFieldsForType(methodType).filter((field) => Boolean(info[field.key]?.trim())).length
}

export function pickCanonicalAccountId(
  accountIds: readonly number[],
  scoreForId: (id: number) => number,
): number {
  return [...accountIds].sort((a, b) => {
    const scoreDiff = scoreForId(b) - scoreForId(a)
    if (scoreDiff !== 0) return scoreDiff
    return a - b
  })[0]!
}
