import { afterEach, describe, expect, it, vi } from "vitest"
import { resetEnvCache } from "@/lib/env"
import { DirectSmtpRecipientVerifier } from "./recipient-verifier"

describe("DirectSmtpRecipientVerifier", () => {
  afterEach(() => {
    delete process.env.EMAIL_FROM
    delete process.env.EMAIL_VALIDATION_PROVIDER
    delete process.env.EMAIL_VALIDATION_TIMEOUT_MS
    resetEnvCache()
  })

  it("maps an accepted SMTP recipient to deliverable", async () => {
    process.env.EMAIL_FROM = "noreply@yoiberifas.com"
    process.env.EMAIL_VALIDATION_PROVIDER = "direct"
    resetEnvCache()
    const probe = vi.fn().mockResolvedValue({ state: "deliverable", reason: "recipient_accepted" })
    const verifier = new DirectSmtpRecipientVerifier({
      probe,
      resolveHosts: vi.fn().mockResolvedValue(["mx.example.com"]),
    })

    await expect(verifier.verify("client@example.com")).resolves.toEqual({
      provider: "direct-smtp",
      state: "deliverable",
      reason: "recipient_accepted",
      score: 100,
    })
    expect(probe).toHaveBeenCalledWith(
      expect.objectContaining({
        helloName: "yoiberifas.com",
        host: "mx.example.com",
        recipient: "client@example.com",
        sender: "noreply@yoiberifas.com",
      }),
    )
  })

  it("tries another MX after an inconclusive response", async () => {
    process.env.EMAIL_FROM = "noreply@yoiberifas.com"
    process.env.EMAIL_VALIDATION_PROVIDER = "direct"
    resetEnvCache()
    const probe = vi
      .fn()
      .mockResolvedValueOnce({ state: "unknown", reason: "policy_rejection" })
      .mockResolvedValueOnce({
        state: "deliverable",
        reason: "recipient_accepted",
      })
    const verifier = new DirectSmtpRecipientVerifier({
      probe,
      resolveHosts: vi.fn().mockResolvedValue(["mx1.example.com", "mx2.example.com"]),
    })

    const result = await verifier.verify("client@example.com")

    expect(result.state).toBe("deliverable")
    expect(probe).toHaveBeenCalledTimes(2)
  })

  it("rejects a domain with no MX or implicit mail host", async () => {
    process.env.EMAIL_VALIDATION_PROVIDER = "direct"
    resetEnvCache()
    const verifier = new DirectSmtpRecipientVerifier({
      probe: vi.fn(),
      resolveHosts: vi.fn().mockResolvedValue([]),
    })

    await expect(verifier.verify("client@missing.invalid")).resolves.toMatchObject({
      state: "undeliverable",
      reason: "domain_has_no_mail_server",
      score: 0,
    })
  })
})
