import { afterEach, describe, expect, it, vi } from "vitest"
import { resetEnvCache } from "@/lib/env"
import { DirectSmtpRecipientVerifier, ReacherRecipientVerifier } from "./recipient-verifier"

afterEach(() => {
  delete process.env.EMAIL_FROM
  delete process.env.EMAIL_VALIDATION_PROVIDER
  delete process.env.EMAIL_VALIDATION_TIMEOUT_MS
  delete process.env.EMAIL_VALIDATION_URL
  delete process.env.EMAIL_VALIDATION_SECRET
  vi.unstubAllGlobals()
  resetEnvCache()
})

describe("DirectSmtpRecipientVerifier", () => {
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

describe("ReacherRecipientVerifier", () => {
  it("accepts a Reacher safe response without invoking the fallback", async () => {
    process.env.EMAIL_VALIDATION_PROVIDER = "reacher"
    process.env.EMAIL_VALIDATION_SECRET = "0123456789abcdef"
    process.env.EMAIL_VALIDATION_URL = "http://127.0.0.1:8081/v1/check_email"
    resetEnvCache()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ is_reachable: "safe" }), { status: 200 }),
      )
    vi.stubGlobal("fetch", fetchMock)
    const fallback = {
      provider: "direct-smtp",
      verify: vi.fn(),
    }
    const verifier = new ReacherRecipientVerifier(fallback)

    await expect(verifier.verify("client@example.com")).resolves.toMatchObject({
      provider: "reacher",
      state: "deliverable",
      score: 100,
    })
    expect(fallback.verify).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:8081/v1/check_email",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ to_email: "client@example.com" }),
        headers: expect.objectContaining({ "x-reacher-secret": "0123456789abcdef" }),
      }),
    )
  })

  it("uses direct SMTP when Reacher cannot verify a provider such as Hotmail", async () => {
    process.env.EMAIL_VALIDATION_PROVIDER = "reacher"
    process.env.EMAIL_VALIDATION_SECRET = "0123456789abcdef"
    resetEnvCache()
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ is_reachable: "unknown" }), { status: 200 }),
        ),
    )
    const fallback = {
      provider: "direct-smtp",
      verify: vi.fn().mockResolvedValue({
        provider: "direct-smtp",
        state: "deliverable",
        reason: "recipient_accepted",
        score: 100,
      }),
    }

    await expect(
      new ReacherRecipientVerifier(fallback).verify("client@hotmail.com"),
    ).resolves.toEqual({
      provider: "reacher+direct-smtp",
      state: "deliverable",
      reason: "reacher_unknown:recipient_accepted",
      score: 100,
    })
  })

  it("suppresses a Reacher invalid result only after direct SMTP confirms it", async () => {
    process.env.EMAIL_VALIDATION_PROVIDER = "reacher"
    process.env.EMAIL_VALIDATION_SECRET = "0123456789abcdef"
    resetEnvCache()
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ is_reachable: "invalid" }), { status: 200 }),
        ),
    )
    const fallback = {
      provider: "direct-smtp",
      verify: vi.fn().mockResolvedValue({
        provider: "direct-smtp",
        state: "undeliverable",
        reason: "mailbox_not_found",
        score: 0,
      }),
    }

    await expect(
      new ReacherRecipientVerifier(fallback).verify("missing@example.com"),
    ).resolves.toEqual({
      provider: "reacher+direct-smtp",
      state: "undeliverable",
      reason: "confirmed:mailbox_not_found",
      score: 0,
    })
  })

  it("holds conflicting invalid and deliverable results instead of suppressing", async () => {
    process.env.EMAIL_VALIDATION_PROVIDER = "reacher"
    process.env.EMAIL_VALIDATION_SECRET = "0123456789abcdef"
    resetEnvCache()
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ is_reachable: "invalid" }), { status: 200 }),
        ),
    )
    const fallback = {
      provider: "direct-smtp",
      verify: vi.fn().mockResolvedValue({
        provider: "direct-smtp",
        state: "deliverable",
        reason: "recipient_accepted",
        score: 100,
      }),
    }

    await expect(
      new ReacherRecipientVerifier(fallback).verify("client@example.com"),
    ).resolves.toMatchObject({
      provider: "reacher+direct-smtp",
      state: "risky",
      reason: "verification_conflict",
    })
  })
})
