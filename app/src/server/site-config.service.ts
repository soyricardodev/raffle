import { getPool } from "@/lib/db.server"

export async function getSiteConfigMap() {
  const pool = getPool()
  const [rows] = await pool.execute("SELECT config_key, config_value FROM site_config ORDER BY config_key", [])
  const configs = rows as { config_key: string; config_value: unknown }[]
  const result: Record<string, unknown> = {}
  for (const row of configs) {
    result[row.config_key] = row.config_value
  }
  return result
}

export async function updateSiteConfigKey(key: string, value: unknown) {
  const pool = getPool()
  const [result] = await pool.execute(
    `UPDATE site_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?`,
    [value as any, key],
  )
  const affected = (result as { affectedRows: number }).affectedRows
  if (affected === 0) {
    await pool.execute("INSERT INTO site_config (config_key, config_value) VALUES (?, ?)", [
      key,
      value as any,
    ])
  }
  return { key, value }
}
