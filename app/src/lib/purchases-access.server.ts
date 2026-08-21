import { getRequest, setCookie } from "@tanstack/react-start/server"
import { requireAdmin } from "@/lib/auth-utils.server"
import { getEnv } from "@/lib/env"
import { getLogger } from "@/lib/logger"
import { assertSameOriginMutation } from "@/lib/origin-guard.server"
import { rateLimit } from "@/lib/rate-limit"
import {
  assertPurchasesAccessKey,
  assertPurchasesAccessKeyMatches,
  assertPurchasesModuleUnlocked,
  createPurchasesAccessCookieValue,
  hashPurchasesAccessKey,
  PURCHASES_ACCESS_COOKIE,
  PURCHASES_ACCESS_SETTINGS_KEY,
  PURCHASES_ACCESS_TTL_SEC,
  type PurchasesAccessStatus,
  readCookieValue,
  readPurchasesAccessHash,
  resolvePurchasesAccessStatus,
} from "@/server/purchases-access"
import * as settingsRepo from "@/server/repositories/settings.repository"

function purchasesAccessSecret(): string {
  const env = getEnv()
  return env.BETTER_AUTH_SECRET || env.DATABASE_URL || "raffle-purchases-access-dev"
}

function cookieSecure(): boolean {
  return getEnv().NODE_ENV === "production"
}

export function readPurchasesAccessCookie(request: Request): string | undefined {
  return readCookieValue(request.headers.get("cookie"), PURCHASES_ACCESS_COOKIE)
}

export async function getPurchasesAccessStatus(request: Request): Promise<PurchasesAccessStatus> {
  const admin = await requireAdmin(request)
  const settings = await settingsRepo.getAppSettings()
  return resolvePurchasesAccessStatus({
    keyHash: readPurchasesAccessHash(settings),
    cookieValue: readPurchasesAccessCookie(request),
    userId: String(admin.id),
    secret: purchasesAccessSecret(),
  })
}

export async function requirePurchasesModuleAccess(request: Request): Promise<void> {
  const status = await getPurchasesAccessStatus(request)
  assertPurchasesModuleUnlocked(status)
}

export async function unlockPurchasesAccess(
  request: Request,
  key: string,
): Promise<PurchasesAccessStatus> {
  assertSameOriginMutation(request)
  const admin = await requireAdmin(request)
  await rateLimit(request, { windowMs: 5 * 60_000, maxRequests: 8, keyPrefix: "purchases-access" })
  const settings = await settingsRepo.getAppSettings()
  const keyHash = readPurchasesAccessHash(settings)
  if (!keyHash) {
    return { required: false, unlocked: true, configured: false }
  }
  try {
    await assertPurchasesAccessKeyMatches(key, keyHash)
  } catch (error) {
    getLogger().warn({ userId: admin.id }, "purchases-access:denied")
    throw error
  }

  setCookie(
    PURCHASES_ACCESS_COOKIE,
    createPurchasesAccessCookieValue({
      userId: String(admin.id),
      keyHash,
      secret: purchasesAccessSecret(),
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: PURCHASES_ACCESS_TTL_SEC,
      secure: cookieSecure(),
    },
  )

  return { required: true, unlocked: true, configured: true }
}

export async function updatePurchasesAccessKey(
  request: Request,
  rawKey: string | null,
): Promise<{ configured: boolean }> {
  assertSameOriginMutation(request)
  await requireAdmin(request)

  const trimmed = rawKey?.trim() ?? ""
  if (!trimmed) {
    const current = await settingsRepo.getAppSettings()
    delete current[PURCHASES_ACCESS_SETTINGS_KEY]
    await settingsRepo.saveAppSettings(current)
    setCookie(PURCHASES_ACCESS_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      secure: cookieSecure(),
    })
    return { configured: false }
  }

  const hash = await hashPurchasesAccessKey(assertPurchasesAccessKey(trimmed))
  await settingsRepo.updateAppSettingsKey(PURCHASES_ACCESS_SETTINGS_KEY, hash)
  setCookie(PURCHASES_ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: cookieSecure(),
  })
  return { configured: true }
}

export function purchasesAccessRequest(): Request {
  return getRequest()
}
