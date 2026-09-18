import { afterEach, describe, expect, it, vi } from "vitest"
import { resetEnvCache } from "@/lib/env"
import { EmailableRecipientVerifier, ReoonRecipientVerifier } from "./recipient-verifier"

describe("EmailableRecipientVerifier", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.EMAIL_VALIDATION_PROVIDER
    delete process.env.EMAIL_VALIDATION_API_KEY
    delete process.env.EMAIL_VALIDATION_TIMEOUT_MS
    resetEnvCache()
  })

  it("maps a deliverable API response without exposing the key in the URL", async () => {
    process.env.EMAIL_VALIDATION_PROVIDER = "emailable"
    process.env.EMAIL_VALIDATION_API_KEY = "live_secret"
    process.env.EMAIL_VALIDATION_TIMEOUT_MS = "5000"
    resetEnvCache()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ state: "deliverable", reason: "accepted_email", score: 100 }), {
        status: 200,
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await new EmailableRecipientVerifier().verify("client@example.com")

    expect(result).toEqual({
      provider: "emailable",
      state: "deliverable",
      reason: "accepted_email",
      score: 100,
    })
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(url.searchParams.get("email")).toBe("client@example.com")
    expect(url.toString()).not.toContain("live_secret")
    expect(init.headers).toEqual({ authorization: "Bearer live_secret" })
  })

  it("rejects unsupported provider states", async () => {
    process.env.EMAIL_VALIDATION_PROVIDER = "emailable"
    process.env.EMAIL_VALIDATION_API_KEY = "live_secret"
    resetEnvCache()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ state: "maybe" }), { status: 200 })),
    )

    await expect(new EmailableRecipientVerifier().verify("client@example.com")).rejects.toThrow(
      /unsupported state/,
    )
  })

  it.each([
    ["safe", "deliverable"],
    ["invalid", "undeliverable"],
    ["catch_all", "risky"],
    ["unknown", "unknown"],
  ] as const)("maps Reoon %s to %s", async (status, state) => {
    process.env.EMAIL_VALIDATION_PROVIDER = "reoon"
    process.env.EMAIL_VALIDATION_API_KEY = "reoon_secret"
    resetEnvCache()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status, overall_score: 90 }), {
        status: 200,
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await new ReoonRecipientVerifier().verify("client@example.com")

    expect(result).toMatchObject({ provider: "reoon", state, reason: status, score: 90 })
    const [url] = fetchMock.mock.calls[0] as [URL]
    expect(url.searchParams.get("mode")).toBe("power")
  })
})
