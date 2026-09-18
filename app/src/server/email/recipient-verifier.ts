import { getEnv } from "@/lib/env"

export type RecipientVerificationState = "deliverable" | "risky" | "undeliverable" | "unknown"

export type RecipientVerificationResult = {
  provider: string
  state: RecipientVerificationState
  reason: string | null
  score: number | null
}

export interface RecipientVerifier {
  readonly provider: string
  verify(email: string): Promise<RecipientVerificationResult>
}

type EmailableResponse = {
  state?: unknown
  reason?: unknown
  score?: unknown
}

type ReoonResponse = {
  status?: unknown
  overall_score?: unknown
}

const VERIFICATION_STATES: ReadonlySet<string> = new Set([
  "deliverable",
  "risky",
  "undeliverable",
  "unknown",
])

export class EmailableRecipientVerifier implements RecipientVerifier {
  readonly provider = "emailable"

  async verify(email: string): Promise<RecipientVerificationResult> {
    const env = getEnv()
    const apiKey = env.EMAIL_VALIDATION_API_KEY?.trim()
    if (!apiKey) {
      throw new Error("EMAIL_VALIDATION_API_KEY is required for Emailable verification")
    }

    const url = new URL("https://api.emailable.com/v1/verify")
    url.searchParams.set("email", email)
    url.searchParams.set("timeout", String(Math.ceil(env.EMAIL_VALIDATION_TIMEOUT_MS / 1_000)))

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(env.EMAIL_VALIDATION_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(`Emailable verification failed with HTTP ${response.status}`)
    }

    const body = (await response.json()) as EmailableResponse
    if (typeof body.state !== "string" || !VERIFICATION_STATES.has(body.state)) {
      throw new Error("Emailable verification returned an unsupported state")
    }

    return {
      provider: this.provider,
      state: body.state as RecipientVerificationState,
      reason: typeof body.reason === "string" ? body.reason : null,
      score: typeof body.score === "number" && Number.isFinite(body.score) ? body.score : null,
    }
  }
}

const REOON_UNDELIVERABLE = new Set(["invalid", "disabled", "spamtrap"])
const REOON_RISKY = new Set(["disposable", "inbox_full", "catch_all", "role_account"])

export class ReoonRecipientVerifier implements RecipientVerifier {
  readonly provider = "reoon"

  async verify(email: string): Promise<RecipientVerificationResult> {
    const env = getEnv()
    const apiKey = env.EMAIL_VALIDATION_API_KEY?.trim()
    if (!apiKey) {
      throw new Error("EMAIL_VALIDATION_API_KEY is required for Reoon verification")
    }

    const url = new URL("https://emailverifier.reoon.com/api/v1/verify")
    url.searchParams.set("email", email)
    url.searchParams.set("key", apiKey)
    url.searchParams.set("mode", "power")

    const response = await fetch(url, {
      signal: AbortSignal.timeout(env.EMAIL_VALIDATION_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`Reoon verification failed with HTTP ${response.status}`)
    }

    const body = (await response.json()) as ReoonResponse
    if (typeof body.status !== "string") {
      throw new Error("Reoon verification returned an unsupported status")
    }

    let state: RecipientVerificationState
    if (body.status === "safe") state = "deliverable"
    else if (REOON_UNDELIVERABLE.has(body.status)) state = "undeliverable"
    else if (REOON_RISKY.has(body.status)) state = "risky"
    else if (body.status === "unknown") state = "unknown"
    else throw new Error("Reoon verification returned an unsupported status")

    return {
      provider: this.provider,
      state,
      reason: body.status,
      score:
        typeof body.overall_score === "number" && Number.isFinite(body.overall_score)
          ? body.overall_score
          : null,
    }
  }
}

export function createRecipientVerifier(): RecipientVerifier | null {
  switch (getEnv().EMAIL_VALIDATION_PROVIDER) {
    case "emailable":
      return new EmailableRecipientVerifier()
    case "reoon":
      return new ReoonRecipientVerifier()
    default:
      return null
  }
}
