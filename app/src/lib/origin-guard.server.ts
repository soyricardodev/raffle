import { ForbiddenError } from "@raffle/shared/errors"
import { getEnv } from "./env"
import { getLogger } from "./logger"

const logger = getLogger()

function allowedOrigins(): Set<string> {
  const env = getEnv()
  const origins = new Set<string>()
  for (const url of [env.APP_URL, env.BETTER_AUTH_URL]) {
    try {
      origins.add(new URL(url).origin)
    } catch {
      // ignore invalid URL in tests
    }
  }
  return origins
}

/**
 * Validates Origin/Referer for state-changing admin API requests (CSRF mitigation).
 * Skipped in test when DISABLE_ORIGIN_GUARD=1.
 */
export function assertSameOriginMutation(request: Request): void {
  if (process.env.DISABLE_ORIGIN_GUARD === "1" || process.env.NODE_ENV === "test") {
    return
  }

  const allowed = allowedOrigins()
  const origin = request.headers.get("origin")
  if (origin) {
    if (!allowed.has(origin)) {
      logger.warn({ origin, allowed: [...allowed] }, "origin-guard:blocked")
      throw new ForbiddenError(["admin"])
    }
    return
  }

  const referer = request.headers.get("referer")
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin
      if (!allowed.has(refOrigin)) {
        logger.warn({ referer, allowed: [...allowed] }, "origin-guard:blocked_referer")
        throw new ForbiddenError(["admin"])
      }
      return
    } catch {
      throw new ForbiddenError(["admin"])
    }
  }

  logger.warn({}, "origin-guard:missing_origin")
  throw new ForbiddenError(["admin"])
}
