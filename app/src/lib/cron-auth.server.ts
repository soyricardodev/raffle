import { timingSafeEqual } from "node:crypto"
import { getEnv } from "@/lib/env"

function secretsMatch(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided)
  const expectedBytes = Buffer.from(expected)
  if (providedBytes.length !== expectedBytes.length) return false
  return timingSafeEqual(providedBytes, expectedBytes)
}

/**
 * Authorizes scheduled calls. Accepts both the header documented in
 * deploy/crontab.example (Authorization: Bearer …) and the explicit x-cron-secret
 * one, so existing cron entries keep working.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const env = getEnv()
  const expected = env.CRON_SECRET ?? env.INNGEST_EVENT_KEY
  if (!expected) return false

  const direct = request.headers.get("x-cron-secret")
  if (direct && secretsMatch(direct, expected)) return true

  const authorization = request.headers.get("authorization")
  if (!authorization) return false

  const [scheme, token] = authorization.split(" ")
  if (scheme?.toLowerCase() !== "bearer" || !token) return false
  return secretsMatch(token, expected)
}
