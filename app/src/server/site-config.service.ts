import { ValidationError } from "@raffle/shared/errors"
import {
  type AdminSiteConfigPatch,
  AdminSiteConfigPatchSchema,
  SITE_CONFIG_PUBLIC_KEYS,
} from "@raffle/shared/site-config"
import { invalidateEmailSettingsCache } from "./email/email-settings.server"
import { PURCHASES_ACCESS_SETTINGS_KEY } from "./purchases-access"
import * as settingsRepo from "./repositories/settings.repository"

export const getSiteConfigMap = settingsRepo.getSiteConfigMap

export async function updateSiteConfigKey(key: string, value: unknown) {
  if (key === PURCHASES_ACCESS_SETTINGS_KEY) {
    throw new ValidationError("La clave de acceso a compras se configura en su propio campo")
  }
  await settingsRepo.updateAppSettingsKey(key, value)
  if (key === "email_settings") {
    invalidateEmailSettingsCache()
  }
  return { key, value }
}

export async function updateSiteConfigPatch(patch: AdminSiteConfigPatch) {
  const parsed = AdminSiteConfigPatchSchema.parse(patch)
  const payload: Record<string, unknown> = {}
  for (const key of SITE_CONFIG_PUBLIC_KEYS) {
    const value = parsed[key]
    if (value !== undefined) {
      payload[key] = value
    }
  }
  if (parsed.email_settings !== undefined) {
    payload.email_settings = parsed.email_settings
  }
  if (parsed.purchase_reject_reasons !== undefined) {
    payload.purchase_reject_reasons = parsed.purchase_reject_reasons
  }
  await settingsRepo.patchAppSettings(payload)
  if (parsed.email_settings !== undefined) {
    invalidateEmailSettingsCache()
  }
  return payload
}
