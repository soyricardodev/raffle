import { formatDate } from "@/lib/format"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function subscriberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase()
  }
  return (parts[0] ?? "").slice(0, 2).toUpperCase()
}

export function formatPushLastSeen(value: string | Date, now = Date.now()): string {
  const then = new Date(value).getTime()
  if (!Number.isFinite(then)) return "—"
  const delta = Math.max(0, now - then)
  if (delta < MINUTE) return "Ahora"
  if (delta < HOUR) return `Hace ${Math.floor(delta / MINUTE)} min`
  if (delta < DAY) return `Hace ${Math.floor(delta / HOUR)} h`
  if (delta < 2 * DAY) return "Ayer"
  if (delta < 7 * DAY) return `Hace ${Math.floor(delta / DAY)} d`
  return formatDate(value)
}
