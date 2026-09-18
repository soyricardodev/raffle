import { describe, expect, it, vi } from "vitest"
import type { RecipientSafetyRepository } from "./recipient-safety"
import { RecipientSafetyService } from "./recipient-safety"
import type { RecipientVerifier } from "./recipient-verifier"

const NOW = new Date("2026-09-18T12:00:00.000Z")

function createRepository(overrides: Partial<RecipientSafetyRepository> = {}) {
  return {
    getSuppression: vi.fn().mockResolvedValue(null),
    getFreshVerification: vi.fn().mockResolvedValue(null),
    upsertVerification: vi.fn().mockResolvedValue(undefined),
    suppressRecipient: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as RecipientSafetyRepository
}

function createVerifier(state: "deliverable" | "risky" | "undeliverable" | "unknown") {
  return {
    provider: "test-provider",
    verify: vi.fn().mockResolvedValue({
      provider: "test-provider",
      state,
      reason: `${state}_reason`,
      score: state === "deliverable" ? 100 : 10,
    }),
  } satisfies RecipientVerifier
}

describe("RecipientSafetyService", () => {
  it("blocks a suppressed recipient before calling the verifier", async () => {
    const repository = createRepository({
      getSuppression: vi.fn().mockResolvedValue({
        email: "client@example.com",
        source: "mailbaby",
        reason: "mailbox_not_found",
        providerMessageId: null,
        createdAt: NOW,
      }),
    })
    const verifier = createVerifier("deliverable")

    const result = await new RecipientSafetyService(verifier, repository, () => NOW).evaluate(
      "CLIENT@example.com",
    )

    expect(result.allowed).toBe(false)
    expect(result.state).toBe("suppressed")
    expect(verifier.verify).not.toHaveBeenCalled()
  })

  it("allows normalized syntax when external verification is disabled", async () => {
    const repository = createRepository()
    const result = await new RecipientSafetyService(null, repository, () => NOW).evaluate(
      "buyer@gmail.con",
    )

    expect(result).toMatchObject({
      allowed: true,
      email: "buyer@gmail.com",
      state: "unchecked",
      source: "disabled",
    })
  })

  it("allows and caches only a deliverable provider result", async () => {
    const repository = createRepository()
    const verifier = createVerifier("deliverable")

    const result = await new RecipientSafetyService(verifier, repository, () => NOW).evaluate(
      "client@example.com",
    )

    expect(result.allowed).toBe(true)
    expect(repository.upsertVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "client@example.com",
        state: "deliverable",
        checkedAt: NOW,
      }),
    )
    expect(repository.suppressRecipient).not.toHaveBeenCalled()
  })

  it("permanently suppresses an undeliverable provider result", async () => {
    const repository = createRepository()
    const result = await new RecipientSafetyService(
      createVerifier("undeliverable"),
      repository,
      () => NOW,
    ).evaluate("missing@example.com")

    expect(result.allowed).toBe(false)
    expect(repository.suppressRecipient).toHaveBeenCalledWith({
      email: "missing@example.com",
      source: "verification:test-provider",
      reason: "undeliverable_reason",
    })
  })

  it("holds risky and unknown results without permanently suppressing them", async () => {
    for (const state of ["risky", "unknown"] as const) {
      const repository = createRepository()
      const result = await new RecipientSafetyService(
        createVerifier(state),
        repository,
        () => NOW,
      ).evaluate(`${state}@example.com`)

      expect(result.allowed).toBe(false)
      expect(result.state).toBe(state)
      expect(repository.suppressRecipient).not.toHaveBeenCalled()
    }
  })

  it("fails closed when the verification provider is unavailable", async () => {
    const repository = createRepository()
    const verifier: RecipientVerifier = {
      provider: "test-provider",
      verify: vi.fn().mockRejectedValue(new Error("timeout")),
    }

    const result = await new RecipientSafetyService(verifier, repository, () => NOW).evaluate(
      "client@example.com",
    )

    expect(result).toMatchObject({
      allowed: false,
      state: "unknown",
      reason: "provider_unavailable",
    })
    expect(repository.upsertVerification).toHaveBeenCalledWith(
      expect.objectContaining({ state: "unknown" }),
    )
  })
})
