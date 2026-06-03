import { resolveLibsqlDatabaseUrl } from "@raffle/shared/db"
import { z } from "zod"

function normalizeDatabaseEnv(
  input: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const next = { ...input }
  const nodeEnv = next.NODE_ENV ?? "development"
  if (next.DATABASE_URL || nodeEnv !== "production") {
    next.DATABASE_URL = resolveLibsqlDatabaseUrl(next.DATABASE_URL)
  }
  return next
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
    APP_URL: z.string().url().default("http://localhost:3000"),
    UPLOAD_DIR: z.string().default("./uploads"),
    EMAIL_PROVIDER: z.enum(["brevo", "resend", "noop"]).default("noop"),
    EMAIL_FROM: z.string().email().optional(),
    EMAIL_FROM_NAME: z.string().min(1).max(100).optional(),
    EMAIL_REPLY_TO: z.string().email().optional(),
    BREVO_API_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    INNGEST_EVENT_KEY: z.string().optional(),
    INNGEST_SIGNING_KEY: z.string().optional(),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
  })
  .refine((data) => data.NODE_ENV !== "production" || Boolean(data.DATABASE_URL), {
    message: "DATABASE_URL is required in production",
    path: ["DATABASE_URL"],
  })

export type ServerEnv = z.infer<typeof envSchema>

function parseEnv(input: Record<string, string | undefined>): ServerEnv {
  const result = envSchema.safeParse(input)
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n")
    throw new Error(`Invalid environment configuration:\n${message}`)
  }
  return result.data
}

let cached: ServerEnv | undefined

/** Validated server env — fail fast on boot. Server-only. */
export function getEnv(): ServerEnv {
  if (!cached) {
    cached = parseEnv(normalizeDatabaseEnv(process.env as Record<string, string | undefined>))
  }
  return cached
}

/** @internal test helper */
export function resetEnvCache(): void {
  cached = undefined
}

/** Use when opening a DB connection — fails if DATABASE_URL is missing. */
export function requireDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? getEnv().DATABASE_URL
  if (!raw && (process.env.NODE_ENV ?? "development") === "production") {
    throw new Error(
      "DATABASE_URL is not configured. Use file:…/packages/shared/data/raffle.db or libsql://… (Turso).",
    )
  }
  return resolveLibsqlDatabaseUrl(raw)
}

export { envSchema, parseEnv }
