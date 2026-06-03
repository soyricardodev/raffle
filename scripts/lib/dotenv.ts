import { existsSync, readFileSync, writeFileSync } from "node:fs"

export function parseDotenv(content: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

export function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  return parseDotenv(readFileSync(path, "utf8"))
}

export function upsertEnvFile(
  path: string,
  updates: Record<string, string>,
): { changed: string[]; created: boolean } {
  const existed = existsSync(path)
  const before = existed ? readEnvFile(path) : {}
  const lines = existed ? readFileSync(path, "utf8").split("\n") : []
  const pending = new Set(Object.keys(updates))
  const changed: string[] = []
  const result: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      result.push(line)
      continue
    }
    const eq = trimmed.indexOf("=")
    if (eq <= 0) {
      result.push(line)
      continue
    }
    const key = trimmed.slice(0, eq).trim()
    if (!pending.has(key)) {
      result.push(line)
      continue
    }
    const next = updates[key]
    if (before[key] !== next) changed.push(key)
    result.push(`${key}=${next}`)
    pending.delete(key)
  }

  if (pending.size > 0) {
    if (result.length > 0 && result[result.length - 1] !== "") result.push("")
    result.push("# ─── Email ──────────────────────────────────────────────────")
    for (const key of pending) {
      const next = updates[key]
      if (before[key] !== next) changed.push(key)
      result.push(`${key}=${next}`)
    }
  }

  const body = result.join("\n")
  writeFileSync(path, body.endsWith("\n") ? body : `${body}\n`, { mode: 0o600 })
  return { changed, created: !existed }
}

export function isUsableResendKey(key: string | undefined): key is string {
  if (!key) return false
  const trimmed = key.trim()
  if (!trimmed || trimmed.startsWith("re_placeholder")) return false
  return trimmed.startsWith("re_")
}
