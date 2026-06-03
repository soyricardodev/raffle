import {
  type AdminSiteConfigPatch,
  AdminSiteConfigPatchSchema,
  SITE_CONFIG_PUBLIC_KEYS,
} from "@raffle/shared/site-config"
import { invalidateEmailSettingsCache } from "./email/email-settings.server"
import * as settingsRepo from "./repositories/settings.repository"

export const getSiteConfigMap = settingsRepo.getSiteConfigMap

export async function updateSiteConfigKey(key: string, value: unknown) {
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
  await settingsRepo.patchAppSettings(payload)
  if (parsed.email_settings !== undefined) {
    invalidateEmailSettingsCache()
  }
  return payload
}
