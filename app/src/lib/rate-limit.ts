import { TooManyRequestsError } from "@raffle/shared/errors"
import { getClientIp } from "./client-ip.server"
import { recordPurchaseMetric } from "./purchase-metrics.server"
import { getLogger } from "./logger"

const logger = getLogger()

type RateLimitStore = Map<string, { count: number; resetAt: number }>

const stores = new Map<string, RateLimitStore>()

let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, store] of stores) {
      for (const [entryKey, entry] of store) {
        if (now >= entry.resetAt) {
          store.delete(entryKey)
        }
      }
      if (store.size === 0) {
        stores.delete(key)
      }
    }
  }, 60_000)
  if (cleanupTimer.unref) cleanupTimer.unref()
}

export type RateLimitConfig = {
  windowMs: number
  maxRequests: number
  keyPrefix?: string
  /** Extra dimension (e.g. raffle id) for per-resource limits. */
  keySuffix?: string
}

function getStore(namespace: string): RateLimitStore {
  let store = stores.get(namespace)
  if (!store) {
    store = new Map()
    stores.set(namespace, store)
  }
  return store
}

function parsePurchaseRateLimit(): { windowMs: number; maxRequests: number } {
  const windowMs = Number(process.env.RATE_LIMIT_PURCHASE_WINDOW_MS ?? 10_000)
  const maxRequests = Number(process.env.RATE_LIMIT_PURCHASE_MAX ?? 5)
  return {
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 10_000,
    maxRequests: Number.isFinite(maxRequests) && maxRequests > 0 ? maxRequests : 5,
  }
}

/** Default limits for POST /api/purchases (overridable via env). */
export function purchaseRateLimitConfig(): RateLimitConfig {
  const { windowMs, maxRequests } = parsePurchaseRateLimit()
  return { windowMs, maxRequests, keyPrefix: "purchase" }
}

export async function rateLimit(request: Request, config: RateLimitConfig): Promise<void> {
  startCleanup()

  const ip = getClientIp(request)
  const namespace = config.keyPrefix ?? "global"
  const suffix = config.keySuffix ? `:${config.keySuffix}` : ""
  const key = `${namespace}:${ip}${suffix}`
  const store = getStore(namespace)
  const now = Date.now()

  let entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + config.windowMs }
    store.set(key, entry)
    return
  }

  entry.count++

  if (entry.count > config.maxRequests) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000)
    logger.warn(
      { ip, count: entry.count, max: config.maxRequests, prefix: config.keyPrefix, keySuffix: config.keySuffix },
      "rate-limit:exceeded",
    )
    if (config.keyPrefix === "purchase") {
      recordPurchaseMetric("purchase_rate_limited", { ip, count: entry.count })
    }
    throw new TooManyRequestsError(retryAfterSec)
  }
}

/** Per-IP + per-raffle purchase throttle (second layer on top of global IP limit). */
export async function rateLimitPurchase(request: Request, raffleId: number): Promise<void> {
  const base = purchaseRateLimitConfig()
  await rateLimit(request, base)
  await rateLimit(request, {
    ...base,
    keyPrefix: "purchase-raffle",
    keySuffix: String(raffleId),
    maxRequests: Math.max(3, Math.floor(base.maxRequests * 0.6)),
  })
}
