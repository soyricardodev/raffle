import { appSettings } from "@raffle/shared/db"
import { desc, eq } from "drizzle-orm"
import { getDb } from "@/lib/db.server"

const DEFAULT_VERSION = 1

export type AppSettingsDocument = Record<string, unknown>

export async function getAppSettings(): Promise<AppSettingsDocument> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(appSettings)
    .orderBy(desc(appSettings.id))
    .limit(1)

  if (!row) return {}
  try {
    return JSON.parse(row.settings) as AppSettingsDocument
  } catch {
    return {}
  }
}

export async function saveAppSettings(settings: AppSettingsDocument): Promise<void> {
  const db = getDb()
  const [existing] = await db
    .select()
    .from(appSettings)
    .orderBy(desc(appSettings.id))
    .limit(1)

  const payload = JSON.stringify(settings)
  if (existing) {
    await db
      .update(appSettings)
      .set({ settings: payload, version: existing.version + 1, updatedAt: new Date() })
      .where(eq(appSettings.id, existing.id))
  } else {
    await db.insert(appSettings).values({
      version: DEFAULT_VERSION,
      settings: payload,
    })
  }
}

export async function updateAppSettingsKey(key: string, value: unknown): Promise<void> {
  const current = await getAppSettings()
  current[key] = value
  await saveAppSettings(current)
}

export async function patchAppSettings(patch: Record<string, unknown>): Promise<AppSettingsDocument> {
  const current = await getAppSettings()
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      current[key] = value
    }
  }
  await saveAppSettings(current)
  return current
}

/** Mapa plano compatible con API legacy `site_config`. */
export async function getSiteConfigMap(): Promise<Record<string, unknown>> {
  return getAppSettings()
}
