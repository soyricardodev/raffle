import { resolveLibsqlDatabaseUrl } from "@raffle/shared/db"
import { z } from "zod"

/** .env values arrive as strings; treat blank as "not configured" so defaults apply. */
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value

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
    EMAIL_PROVIDER: z.enum(["brevo", "resend", "smtp", "noop"]).default("noop"),
    EMAIL_VALIDATION_PROVIDER: z.enum(["none", "direct"]).default("none"),
    EMAIL_VALIDATION_TIMEOUT_MS: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().min(2_000).max(10_000).default(5_000),
    ),
    EMAIL_FROM: z.string().email().optional(),
    EMAIL_FROM_NAME: z.string().min(1).max(100).optional(),
    EMAIL_REPLY_TO: z.string().email().optional(),
    BREVO_API_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    /**
     * SMTP relay (MailBaby). MailBaby does not sign DKIM for the sending domain,
     * so signing must happen here or DMARC p=reject gets the message rejected.
     */
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.preprocess(blankToUndefined, z.coerce.number().int().positive().default(587)),
    /** true for implicit TLS (port 465). MailBaby recommends 587 + STARTTLS. */
    SMTP_SECURE: z
      .string()
      .optional()
      .transform((value) => value === "true" || value === "1"),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_MAX_CONNECTIONS: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().positive().default(3),
    ),
    SMTP_MAX_MESSAGES: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().positive().default(100),
    ),
    /** Max messages per second across the pool — avoids burst flags on the relay. */
    SMTP_RATE_LIMIT: z.preprocess(blankToUndefined, z.coerce.number().int().positive().default(5)),
    SMTP_DKIM_DOMAIN: z.string().optional(),
    SMTP_DKIM_SELECTOR: z.string().optional(),
    /** PEM key with literal \n escapes. Prefer SMTP_DKIM_PRIVATE_KEY_PATH when possible. */
    SMTP_DKIM_PRIVATE_KEY: z.string().optional(),
    SMTP_DKIM_PRIVATE_KEY_PATH: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    INNGEST_EVENT_KEY: z.string().optional(),
    INNGEST_SIGNING_KEY: z.string().optional(),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
    /** When true, WhatsApp becomes the public support channel again. Default: Telegram. */
    ENABLE_WHATSAPP: z
      .string()
      .optional()
      .transform((value) => value === "true" || value === "1"),
    VAPID_PUBLIC_KEY: z.string().min(20).optional(),
    VAPID_PRIVATE_KEY: z.string().min(20).optional(),
    /** mailto: or https: URL required by Web Push. */
    VAPID_SUBJECT: z.string().min(3).optional(),
  })
  .refine((data) => data.NODE_ENV !== "production" || Boolean(data.DATABASE_URL), {
    message: "DATABASE_URL is required in production",
    path: ["DATABASE_URL"],
  })
  .refine(
    (data) =>
      data.NODE_ENV !== "production" ||
      data.EMAIL_PROVIDER === "noop" ||
      data.EMAIL_VALIDATION_PROVIDER !== "none",
    {
      message: "Recipient validation is required before enabling production email delivery",
      path: ["EMAIL_VALIDATION_PROVIDER"],
    },
  )

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
