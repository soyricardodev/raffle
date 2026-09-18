import { normalizeEmail } from "@raffle/shared/validators"
import { z } from "zod"
import { getLogger } from "@/lib/logger"
import * as safetyRepo from "@/server/repositories/email-recipient-safety.repository"
import {
  createRecipientVerifier,
  type RecipientVerificationResult,
  type RecipientVerificationState,
  type RecipientVerifier,
} from "./recipient-verifier"

const logger = getLogger()
const emailSyntax = z.string().email()

const VERIFICATION_TTL_MS: Record<RecipientVerificationState, number> = {
  deliverable: 90 * 24 * 60 * 60 * 1_000,
  risky: 7 * 24 * 60 * 60 * 1_000,
  undeliverable: 365 * 24 * 60 * 60 * 1_000,
  unknown: 15 * 60 * 1_000,
}

export type RecipientSafetyDecision = {
  allowed: boolean
  email: string
  state: RecipientVerificationState | "suppressed" | "unchecked"
  reason: string | null
  source: "suppression" | "cache" | "provider" | "local" | "disabled"
}

export type RecipientSafetyRepository = {
  getSuppression: typeof safetyRepo.getSuppression
  getFreshVerification: typeof safetyRepo.getFreshVerification
  upsertVerification: typeof safetyRepo.upsertVerification
  suppressRecipient: typeof safetyRepo.suppressRecipient
}

export class RecipientSafetyService {
  private readonly inFlight = new Map<string, Promise<RecipientSafetyDecision>>()

  constructor(
    private readonly verifier: RecipientVerifier | null,
    private readonly repository: RecipientSafetyRepository = safetyRepo,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async evaluate(rawEmail: string): Promise<RecipientSafetyDecision> {
    const email = normalizeEmail(rawEmail).trim().toLowerCase()
    const existing = this.inFlight.get(email)
    if (existing) return existing

    const evaluation = this.evaluateOnce(email).finally(() => this.inFlight.delete(email))
    this.inFlight.set(email, evaluation)
    return evaluation
  }

  private async evaluateOnce(email: string): Promise<RecipientSafetyDecision> {
    const suppression = await this.repository.getSuppression(email)
    if (suppression) {
      return {
        allowed: false,
        email,
        state: "suppressed",
        reason: suppression.reason,
        source: "suppression",
      }
    }

    if (!emailSyntax.safeParse(email).success) {
      await this.repository.suppressRecipient({
        email,
        source: "local_validation",
        reason: "invalid_syntax",
      })
      return {
        allowed: false,
        email,
        state: "undeliverable",
        reason: "invalid_syntax",
        source: "local",
      }
    }

    const now = this.now()
    const cached = await this.repository.getFreshVerification(email, now)
    if (cached) {
      return {
        allowed: cached.state === "deliverable",
        email,
        state: cached.state,
        reason: cached.reason,
        source: "cache",
      }
    }

    if (!this.verifier) {
      return {
        allowed: true,
        email,
        state: "unchecked",
        reason: null,
        source: "disabled",
      }
    }

    let result: RecipientVerificationResult
    try {
      result = await this.verifier.verify(email)
    } catch (error) {
      logger.error(
        { provider: this.verifier.provider, error: String(error) },
        "email:recipient_verification_failed",
      )
      result = {
        provider: this.verifier.provider,
        state: "unknown",
        reason: "provider_unavailable",
        score: null,
      }
    }

    await this.repository.upsertVerification({
      email,
      provider: result.provider,
      state: result.state,
      reason: result.reason,
      score: result.score,
      checkedAt: now,
      expiresAt: new Date(now.getTime() + VERIFICATION_TTL_MS[result.state]),
    })

    if (result.state === "undeliverable") {
      await this.repository.suppressRecipient({
        email,
        source: `verification:${result.provider}`,
        reason: result.reason ?? "undeliverable",
      })
    }

    return {
      allowed: result.state === "deliverable",
      email,
      state: result.state,
      reason: result.reason,
      source: "provider",
    }
  }
}

let service: RecipientSafetyService | undefined

export function getRecipientSafetyService(): RecipientSafetyService {
  service ??= new RecipientSafetyService(createRecipientVerifier())
  return service
}

/** @internal test helper */
export function resetRecipientSafetyService(): void {
  service = undefined
}
