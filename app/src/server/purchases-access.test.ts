import { describe, expect, it } from "vitest"
import {
  assertPurchasesAccessKey,
  createPurchasesAccessCookieValue,
  PURCHASES_ACCESS_COOKIE,
  PURCHASES_ACCESS_SETTINGS_KEY,
  readCookieValue,
  resolvePurchasesAccessStatus,
  sanitizeAdminConfigMap,
  verifyPurchasesAccessCookieValue,
} from "./purchases-access"

const secret = "test-purchases-access-secret-value"
const userId = "admin-1"
const keyHash = "hashed-key-v1"

describe("sanitizeAdminConfigMap", () => {
  it("strips the stored hash and reports whether a key is configured", () => {
    expect(
      sanitizeAdminConfigMap({
        site_info: { site_name: "Rifa" },
        [PURCHASES_ACCESS_SETTINGS_KEY]: "scrypt-hash",
      }),
    ).toEqual({
      site_info: { site_name: "Rifa" },
      purchases_access_configured: true,
    })

    expect(sanitizeAdminConfigMap({ site_info: { site_name: "Rifa" } })).toEqual({
      site_info: { site_name: "Rifa" },
      purchases_access_configured: false,
    })
  })
})

describe("readCookieValue", () => {
  it("reads the named cookie and ignores neighbors", () => {
    expect(readCookieValue(null, PURCHASES_ACCESS_COOKIE)).toBeUndefined()
    expect(
      readCookieValue(
        `sid=abc; ${PURCHASES_ACCESS_COOKIE}=token.one; other=1`,
        PURCHASES_ACCESS_COOKIE,
      ),
    ).toBe("token.one")
  })
})

describe("assertPurchasesAccessKey", () => {
  it("rejects short or oversized keys", () => {
    expect(() => assertPurchasesAccessKey("ab")).toThrow(/al menos/)
    expect(() => assertPurchasesAccessKey("x".repeat(81))).toThrow(/superar/)
  })

  it("trims a valid key", () => {
    expect(assertPurchasesAccessKey("  clave-ok  ")).toBe("clave-ok")
  })
})

describe("purchases access cookie", () => {
  it("accepts a fresh cookie and rejects expired, foreign, or stale hashes", () => {
    const nowMs = 1_700_000_000_000
    const value = createPurchasesAccessCookieValue({
      userId,
      keyHash,
      secret,
      nowMs,
      ttlSec: 60,
    })

    expect(
      verifyPurchasesAccessCookieValue({
        value,
        userId,
        keyHash,
        secret,
        nowMs: nowMs + 1_000,
      }),
    ).toBe(true)

    expect(
      verifyPurchasesAccessCookieValue({
        value,
        userId,
        keyHash,
        secret,
        nowMs: nowMs + 61_000,
      }),
    ).toBe(false)

    expect(
      verifyPurchasesAccessCookieValue({
        value,
        userId: "other-admin",
        keyHash,
        secret,
        nowMs: nowMs + 1_000,
      }),
    ).toBe(false)

    expect(
      verifyPurchasesAccessCookieValue({
        value,
        userId,
        keyHash: "hashed-key-v2",
        secret,
        nowMs: nowMs + 1_000,
      }),
    ).toBe(false)
  })
})

describe("hash and match purchases access key", () => {
  it("accepts the same key and rejects a different one", async () => {
    const { hashPurchasesAccessKey, matchPurchasesAccessKey } = await import("./purchases-access")
    const hash = await hashPurchasesAccessKey("clave-admin")
    expect(await matchPurchasesAccessKey("clave-admin", hash)).toBe(true)
    expect(await matchPurchasesAccessKey("otra-clave", hash)).toBe(false)
  })
})

describe("resolvePurchasesAccessStatus", () => {
  it("stays open when no key is configured", () => {
    expect(
      resolvePurchasesAccessStatus({
        keyHash: null,
        cookieValue: undefined,
        userId,
        secret,
      }),
    ).toEqual({ required: false, unlocked: true, configured: false })
  })

  it("requires a valid cookie once a key exists", () => {
    const locked = resolvePurchasesAccessStatus({
      keyHash,
      cookieValue: undefined,
      userId,
      secret,
    })
    expect(locked).toEqual({ required: true, unlocked: false, configured: true })

    const value = createPurchasesAccessCookieValue({ userId, keyHash, secret })
    expect(
      resolvePurchasesAccessStatus({
        keyHash,
        cookieValue: value,
        userId,
        secret,
      }),
    ).toEqual({ required: true, unlocked: true, configured: true })
  })
})
