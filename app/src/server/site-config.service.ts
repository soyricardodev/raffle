import {
  type AdminSiteConfigPatch,
  AdminSiteConfigPatchSchema,
  SITE_CONFIG_PUBLIC_KEYS,
} from "@raffle/shared/site-config"
import * as settingsRepo from "./repositories/settings.repository"

export const getSiteConfigMap = settingsRepo.getSiteConfigMap

export async function updateSiteConfigKey(key: string, value: unknown) {
  await settingsRepo.updateAppSettingsKey(key, value)
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
  await settingsRepo.patchAppSettings(payload)
  return payload
}
