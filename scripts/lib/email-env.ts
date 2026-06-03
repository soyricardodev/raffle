import { createClient } from "@libsql/client"
import mysql from "mysql2/promise"

export type EmailSenderConfig = {
  fromEmail: string
  fromName?: string
  replyTo?: string
}

type PartialSender = Partial<EmailSenderConfig>

const ONBOARDING_FALLBACK = "onboarding@resend.dev"

function trim(value: string | undefined): string {
  return value?.trim() ?? ""
}

function isUsableFromEmail(email: string | undefined): email is string {
  const trimmed = trim(email)
  if (!trimmed) return false
  if (trimmed === ONBOARDING_FALLBACK) return false
  return trimmed.includes("@")
}

export function pickSenderFromEnv(env: Record<string, string>): PartialSender {
  const fromEmail =
    trim(env.EMAIL_FROM) ||
    trim(env.FROM_EMAIL) ||
    trim(env.RESEND_FROM_EMAIL) ||
    trim(env.RESEND_FROM)
  const fromName = trim(env.EMAIL_FROM_NAME) || trim(env.FROM_NAME)
  const replyTo = trim(env.EMAIL_REPLY_TO) || trim(env.REPLY_TO)

  return {
    ...(isUsableFromEmail(fromEmail) ? { fromEmail } : {}),
    ...(fromName ? { fromName } : {}),
    ...(replyTo ? { replyTo } : {}),
  }
}

function pickSenderFromEmailSettings(raw: unknown): PartialSender {
  if (!raw || typeof raw !== "object") return {}
  const settings = raw as Record<string, unknown>
  const fromEmail = typeof settings.from_email === "string" ? settings.from_email : ""
  const fromName = typeof settings.from_name === "string" ? settings.from_name : ""
  const replyTo = typeof settings.reply_to === "string" ? settings.reply_to : ""

  return {
    ...(isUsableFromEmail(fromEmail) ? { fromEmail: fromEmail.trim() } : {}),
    ...(fromName.trim() ? { fromName: fromName.trim() } : {}),
    ...(replyTo.trim() ? { replyTo: replyTo.trim() } : {}),
  }
}

export async function fetchSenderFromLegacyMysql(
  legacy: Record<string, string>,
): Promise<PartialSender> {
  const host = legacy.DB_HOST ?? "127.0.0.1"
  const port = Number(legacy.DB_PORT ?? "3306")
  const user = legacy.DB_USER ?? "root"
  const password = legacy.DB_PASSWORD ?? ""
  const database = legacy.DB_NAME ?? "raffle_db"

  let conn: mysql.Connection | undefined
  try {
    conn = await mysql.createConnection({ host, port, user, password, database })
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      "SELECT config_value FROM site_config WHERE config_key = 'email_settings' LIMIT 1",
    )
    const row = rows[0]
    if (!row?.config_value) return {}

    const raw =
      typeof row.config_value === "string" ? JSON.parse(row.config_value) : row.config_value
    return pickSenderFromEmailSettings(raw)
  } catch {
    return {}
  } finally {
    await conn?.end()
  }
}

export async function fetchSenderFromAppSettingsDb(databaseUrl: string): Promise<PartialSender> {
  if (!databaseUrl.startsWith("file:")) return {}

  let client: ReturnType<typeof createClient> | undefined
  try {
    client = createClient({ url: databaseUrl })
    const result = await client.execute(
      "SELECT settings FROM app_settings ORDER BY id DESC LIMIT 1",
    )
    const settingsRaw = result.rows[0]?.settings
    if (typeof settingsRaw !== "string") return {}

    const settings = JSON.parse(settingsRaw) as Record<string, unknown>
    return pickSenderFromEmailSettings(settings.email_settings)
  } catch {
    return {}
  } finally {
    client?.close()
  }
}

export function mergeSenderConfig(...sources: PartialSender[]): EmailSenderConfig | null {
  const merged: PartialSender = {}
  for (const source of sources) {
    if (source.fromEmail) merged.fromEmail = source.fromEmail
    if (source.fromName) merged.fromName = source.fromName
    if (source.replyTo) merged.replyTo = source.replyTo
  }
  if (!isUsableFromEmail(merged.fromEmail)) return null
  return {
    fromEmail: merged.fromEmail,
    fromName: merged.fromName,
    replyTo: merged.replyTo,
  }
}

export async function resolveEmailSenderConfig(input: {
  legacyEnv: Record<string, string>
  targetEnv: Record<string, string>
  databaseUrl?: string
}): Promise<EmailSenderConfig | null> {
  const fromLegacyEnv = pickSenderFromEnv(input.legacyEnv)
  const fromTargetEnv = pickSenderFromEnv(input.targetEnv)
  const fromMysql = Object.keys(input.legacyEnv).length
    ? await fetchSenderFromLegacyMysql(input.legacyEnv)
    : {}
  const fromDb = input.databaseUrl
    ? await fetchSenderFromAppSettingsDb(input.databaseUrl)
    : {}

  return mergeSenderConfig(fromLegacyEnv, fromMysql, fromDb, fromTargetEnv)
}

export function senderToEnvUpdates(sender: EmailSenderConfig): Record<string, string> {
  const updates: Record<string, string> = { EMAIL_FROM: sender.fromEmail }
  if (sender.fromName) updates.EMAIL_FROM_NAME = sender.fromName
  if (sender.replyTo) updates.EMAIL_REPLY_TO = sender.replyTo
  return updates
}
