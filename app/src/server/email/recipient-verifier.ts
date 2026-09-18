import { getEnv } from "@/lib/env"
import {
  createCatchAllAddress,
  probeSmtpRecipient,
  resolveMailHosts,
  type SmtpProbeResult,
} from "./direct-smtp-verifier"

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

type DirectVerifierDependencies = {
  probe: typeof probeSmtpRecipient
  resolveHosts: typeof resolveMailHosts
}

type ReacherResponse = {
  is_reachable?: unknown
}

const defaultDependencies: DirectVerifierDependencies = {
  probe: probeSmtpRecipient,
  resolveHosts: resolveMailHosts,
}

class ConcurrencyGate {
  private active = 0
  private readonly waiting: Array<() => void> = []

  constructor(private readonly limit: number) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) await new Promise<void>((resolve) => this.waiting.push(resolve))
    this.active += 1
    try {
      return await operation()
    } finally {
      this.active -= 1
      this.waiting.shift()?.()
    }
  }
}

export class DirectSmtpRecipientVerifier implements RecipientVerifier {
  readonly provider = "direct-smtp"
  private readonly gate = new ConcurrencyGate(2)

  constructor(private readonly dependencies: DirectVerifierDependencies = defaultDependencies) {}

  verify(email: string): Promise<RecipientVerificationResult> {
    return this.gate.run(() => this.verifyWithoutThrottle(email))
  }

  private async verifyWithoutThrottle(email: string): Promise<RecipientVerificationResult> {
    const env = getEnv()
    const domain = email.slice(email.lastIndexOf("@") + 1)
    const sender = env.EMAIL_FROM ?? `noreply@${new URL(env.APP_URL).hostname}`
    const helloName = sender.slice(sender.lastIndexOf("@") + 1)
    const hosts = await this.dependencies.resolveHosts(domain)

    if (hosts.length === 0) {
      return this.toResult({
        state: "undeliverable",
        reason: "domain_has_no_mail_server",
      })
    }

    const deadline = Date.now() + env.EMAIL_VALIDATION_TIMEOUT_MS
    let lastResult: SmtpProbeResult = {
      state: "unknown",
      reason: "connection_failed",
    }

    for (const host of hosts) {
      const remaining = deadline - Date.now()
      if (remaining <= 0) break

      try {
        lastResult = await this.dependencies.probe({
          catchAllEmail: createCatchAllAddress(domain),
          helloName,
          host,
          recipient: email,
          sender,
          timeoutMs: remaining,
        })
      } catch {
        lastResult = { state: "unknown", reason: "connection_failed" }
      }

      if (lastResult.state !== "unknown") return this.toResult(lastResult)
    }

    return this.toResult(lastResult)
  }

  private toResult(result: SmtpProbeResult): RecipientVerificationResult {
    return {
      provider: this.provider,
      state: result.state,
      reason: result.reason,
      score:
        result.state === "deliverable"
          ? 100
          : result.state === "risky"
            ? 50
            : result.state === "undeliverable"
              ? 0
              : null,
    }
  }
}

export class ReacherRecipientVerifier implements RecipientVerifier {
  readonly provider = "reacher"

  async verify(email: string): Promise<RecipientVerificationResult> {
    const env = getEnv()
    if (!env.EMAIL_VALIDATION_SECRET) {
      throw new Error("EMAIL_VALIDATION_SECRET is required for Reacher verification")
    }

    const response = await fetch(env.EMAIL_VALIDATION_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-reacher-secret": env.EMAIL_VALIDATION_SECRET,
      },
      body: JSON.stringify({ to_email: email }),
      signal: AbortSignal.timeout(env.EMAIL_VALIDATION_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`Reacher verification failed with HTTP ${response.status}`)
    }

    const body = (await response.json()) as ReacherResponse
    if (!isReacherState(body.is_reachable)) {
      throw new Error("Reacher verification returned an unsupported state")
    }

    const state = REACHER_STATE_MAP[body.is_reachable]
    return {
      provider: this.provider,
      state,
      reason: `reacher_${body.is_reachable}`,
      score:
        state === "deliverable"
          ? 100
          : state === "risky"
            ? 50
            : state === "undeliverable"
              ? 0
              : null,
    }
  }
}

const REACHER_STATE_MAP = {
  safe: "deliverable",
  invalid: "undeliverable",
  risky: "risky",
  unknown: "unknown",
} as const

function isReacherState(value: unknown): value is keyof typeof REACHER_STATE_MAP {
  return typeof value === "string" && value in REACHER_STATE_MAP
}

export function createRecipientVerifier(): RecipientVerifier | null {
  switch (getEnv().EMAIL_VALIDATION_PROVIDER) {
    case "direct":
      return new DirectSmtpRecipientVerifier()
    case "reacher":
      return new ReacherRecipientVerifier()
    default:
      return null
  }
}
