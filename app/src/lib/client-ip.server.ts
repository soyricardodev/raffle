/**
 * Resolves client IP for rate limiting and audit logs.
 * Only trusts X-Forwarded-For when TRUST_PROXY is enabled (behind a known reverse proxy).
 */
export function getClientIp(request: Request): string {
  const trustProxy = process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1"

  if (trustProxy) {
    const forwarded = request.headers.get("x-forwarded-for")
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim()
      if (first) return first
    }
    const realIp = request.headers.get("x-real-ip")?.trim()
    if (realIp) return realIp
  }

  return "127.0.0.1"
}
