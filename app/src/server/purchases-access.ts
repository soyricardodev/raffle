import { createHmac, timingSafeEqual } from "node:crypto"
import {
  PurchasesAccessDeniedError,
  PurchasesAccessRequiredError,
  ValidationError,
} from "@raffle/shared/errors"
import { hashPassword, verifyPassword } from "better-auth/crypto"

export const PURCHASES_ACCESS_SETTINGS_KEY = "purchases_access_key_hash"
export const PURCHASES_ACCESS_COOKIE = "raffle_purchases_access"
export const PURCHASES_ACCESS_TTL_SEC = 12 * 60 * 60
export const PURCHASES_ACCESS_KEY_MIN = 4
export const PURCHASES_ACCESS_KEY_MAX = 80

export type PurchasesAccessStatus = {
  required: boolean
  unlocked: boolean
  configured: boolean
}

export function sanitizeAdminConfigMap(map: Record<string, unknown>): Record<string, unknown> {
  const hash = map[PURCHASES_ACCESS_SETTINGS_KEY]
  const rest = { ...map }
  delete rest[PURCHASES_ACCESS_SETTINGS_KEY]
  return {
    ...rest,
    purchases_access_configured: typeof hash === "string" && hash.length > 0,
  }
}

export function readCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(`${name}=`)) continue
    return decodeURIComponent(trimmed.slice(name.length + 1))
  }
  return undefined
}

export function readPurchasesAccessHash(settings: Record<string, unknown>): string | null {
  const hash = settings[PURCHASES_ACCESS_SETTINGS_KEY]
  return typeof hash === "string" && hash.length > 0 ? hash : null
}

export function normalizePurchasesAccessKey(raw: string): string {
  return raw.trim()
}

export function assertPurchasesAccessKey(raw: string): string {
  const key = normalizePurchasesAccessKey(raw)
  if (key.length < PURCHASES_ACCESS_KEY_MIN) {
    throw new ValidationError(`La clave debe tener al menos ${PURCHASES_ACCESS_KEY_MIN} caracteres`)
  }
  if (key.length > PURCHASES_ACCESS_KEY_MAX) {
    throw new ValidationError(`La clave no puede superar ${PURCHASES_ACCESS_KEY_MAX} caracteres`)
  }
  return key
}

export async function hashPurchasesAccessKey(key: string): Promise<string> {
  return hashPassword(assertPurchasesAccessKey(key))
}

export async function matchPurchasesAccessKey(key: string, hash: string): Promise<boolean> {
  const normalized = normalizePurchasesAccessKey(key)
  if (!normalized) return false
  return verifyPassword({ hash, password: normalized })
}

export function createPurchasesAccessCookieValue(input: {
  userId: string
  keyHash: string
  secret: string
  nowMs?: number
  ttlSec?: number
}): string {
  const nowMs = input.nowMs ?? Date.now()
  const ttlSec = input.ttlSec ?? PURCHASES_ACCESS_TTL_SEC
  const expMs = nowMs + ttlSec * 1000
  const payload = `${expMs}.${signPurchasesAccess(input.userId, input.keyHash, expMs, input.secret)}`
  return payload
}

export function verifyPurchasesAccessCookieValue(input: {
  value: string | undefined
  userId: string
  keyHash: string
  secret: string
  nowMs?: number
}): boolean {
  const value = input.value
  if (!value) return false
  const sep = value.indexOf(".")
  if (sep <= 0 || sep === value.length - 1) return false
  const expMs = Number(value.slice(0, sep))
  const signature = value.slice(sep + 1)
  if (!Number.isFinite(expMs) || !signature) return false
  const nowMs = input.nowMs ?? Date.now()
  if (nowMs >= expMs) return false
  const expected = signPurchasesAccess(input.userId, input.keyHash, expMs, input.secret)
  return safeEqual(signature, expected)
}

export function resolvePurchasesAccessStatus(input: {
  keyHash: string | null
  cookieValue: string | undefined
  userId: string
  secret: string
  nowMs?: number
}): PurchasesAccessStatus {
  const configured = Boolean(input.keyHash)
  if (!input.keyHash) {
    return { required: false, unlocked: true, configured: false }
  }
  const unlocked = verifyPurchasesAccessCookieValue({
    value: input.cookieValue,
    userId: input.userId,
    keyHash: input.keyHash,
    secret: input.secret,
    nowMs: input.nowMs,
  })
  return { required: true, unlocked, configured }
}

export function assertPurchasesModuleUnlocked(status: PurchasesAccessStatus): void {
  if (status.required && !status.unlocked) {
    throw new PurchasesAccessRequiredError()
  }
}

export async function assertPurchasesAccessKeyMatches(
  key: string,
  hash: string | null,
): Promise<void> {
  if (!hash) {
    throw new PurchasesAccessRequiredError()
  }
  const ok = await matchPurchasesAccessKey(key, hash)
  if (!ok) {
    throw new PurchasesAccessDeniedError()
  }
}

function signPurchasesAccess(
  userId: string,
  keyHash: string,
  expMs: number,
  secret: string,
): string {
  return createHmac("sha256", secret).update(`${userId}\0${keyHash}\0${expMs}`).digest("base64url")
}

function safeEqual(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left)
  const rightBuf = Buffer.from(right)
  if (leftBuf.length !== rightBuf.length) return false
  return timingSafeEqual(leftBuf, rightBuf)
}
