import { TooManyRequestsError } from "@raffle/shared/errors"
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
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]!.trim()
  }
  return "127.0.0.1"
}

function getStore(key: string): RateLimitStore {
  let store = stores.get(key)
  if (!store) {
    store = new Map()
    stores.set(key, store)
  }
  return store
}

export async function rateLimit(request: Request, config: RateLimitConfig): Promise<void> {
  startCleanup()

  const ip = getClientIp(request)
  const key = `${config.keyPrefix ?? "global"}:${ip}`
  const store = getStore(config.keyPrefix ?? "global")
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
      { ip, count: entry.count, max: config.maxRequests, prefix: config.keyPrefix },
      "rate-limit:exceeded",
    )
    throw new TooManyRequestsError(retryAfterSec)
  }
}
