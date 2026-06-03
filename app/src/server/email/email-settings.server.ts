import {
  type EmailSettings,
  isUsableSenderEmail,
  normalizeEmailSettings,
} from "@raffle/shared/site-config"
import { getEnv } from "@/lib/env"
import * as settingsRepo from "../repositories/settings.repository"
import type { EmailSenderConfig } from "./email-from"

let cachedSettings: EmailSettings | null = null
let cachedSiteName = ""

export function invalidateEmailSettingsCache(): void {
  cachedSettings = null
  cachedSiteName = ""
}

async function loadEmailSettingsContext(): Promise<{
  settings: EmailSettings
  siteName: string
}> {
  if (cachedSettings) {
    return { settings: cachedSettings, siteName: cachedSiteName }
  }

  const doc = await settingsRepo.getAppSettings()
  const siteInfo = doc.site_info as { site_name?: string } | undefined
  cachedSettings = normalizeEmailSettings(doc.email_settings)
  cachedSiteName = String(siteInfo?.site_name ?? "").trim()
  return { settings: cachedSettings, siteName: cachedSiteName }
}

export async function getEmailSettings(): Promise<EmailSettings> {
  const { settings } = await loadEmailSettingsContext()
  return settings
}

export async function shouldSendAutomatedEmail(
  type: "purchase_confirmation" | "status_update" | "ticket_modification",
): Promise<boolean> {
  const settings = await getEmailSettings()
  if (!settings.enabled) return false
  switch (type) {
    case "purchase_confirmation":
      return settings.send_confirmation
    case "status_update":
      return settings.send_status_updates
    case "ticket_modification":
      return settings.send_modifications
  }
}

export async function resolveEmailSenderConfig(): Promise<EmailSenderConfig> {
  const { settings, siteName } = await loadEmailSettingsContext()
  const env = getEnv()

  const fromEmail =
    (isUsableSenderEmail(settings.from_email) && settings.from_email.trim()) ||
    (isUsableSenderEmail(env.EMAIL_FROM) && env.EMAIL_FROM!.trim()) ||
    null

  if (!fromEmail) {
    throw new Error(
      "Configura el email del remitente en Configuración → Correos o EMAIL_FROM en el servidor",
    )
  }

  return {
    fromEmail,
    fromName:
      settings.from_name.trim() ||
      env.EMAIL_FROM_NAME?.trim() ||
      siteName ||
      undefined,
    replyTo: settings.reply_to.trim() || env.EMAIL_REPLY_TO?.trim() || undefined,
  }
}
