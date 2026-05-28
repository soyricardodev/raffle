import * as settingsRepo from "./repositories/settings.repository"

export const getSiteConfigMap = settingsRepo.getSiteConfigMap

export async function updateSiteConfigKey(key: string, value: unknown) {
  await settingsRepo.updateAppSettingsKey(key, value)
  return { key, value }
}
