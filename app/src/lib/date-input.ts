import { startOfDay as startOfDayFns } from "date-fns"

export { startOfDayFns as startOfDay }

export function parseDatetimeLocal(value: string): Date | undefined {
  if (!value.trim()) return undefined
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/)
  if (!match) return undefined
  const [, year, month, day, hours = "0", minutes = "0"] = match
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
  )
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function formatDatetimeLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function isoToDatetimeLocal(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO datetime: ${iso}`)
  }
  return formatDatetimeLocal(date)
}

export function datetimeLocalToIso(value: string): string {
  const parsed = parseDatetimeLocal(value)
  if (!parsed) {
    throw new Error(`Invalid datetime-local value: ${value}`)
  }
  return parsed.toISOString()
}

export function extractTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

export function combineDateAndTime(date: Date, time: string): Date {
  const [hours = 0, minutes = 0] = time.split(":").map(Number)
  const next = new Date(date)
  next.setHours(hours, minutes, 0, 0)
  return next
}

export function parseDateOnly(value?: string | null): Date | undefined {
  if (!value) return undefined
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined
  }
  return date
}

export function formatDateOnly(date?: Date): string | undefined {
  if (!date) return undefined
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function isCalendarDayBeforeDate(date: Date, minDay: Date): boolean {
  return startOfDayFns(date).getTime() < startOfDayFns(minDay).getTime()
}

export function isCalendarDayBefore(value: string, minDay: Date): boolean {
  const parsed = parseDatetimeLocal(value)
  if (!parsed) return false
  return isCalendarDayBeforeDate(parsed, minDay)
}

export function formatDatePickerLabel(date: Date): string {
  return date.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatDateRangeLabel(start?: string | null, end?: string | null): string {
  const fromDate = start ? parseDateOnly(start) : undefined
  const toDate = end ? parseDateOnly(end) : undefined
  const from = fromDate ? formatDatePickerLabel(fromDate) : start ? start : null
  const to = toDate ? formatDatePickerLabel(toDate) : end ? end : null
  if (from && to) return `${from} – ${to}`
  if (from) return `${from} – Fin`
  if (to) return `Inicio – ${to}`
  return "Fechas"
}

export function formatDatetimePickerLabel(date: Date): string {
  return date.toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getLocalTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function storedRangeFromDateRange(range?: { from?: Date; to?: Date }) {
  return {
    start: formatDateOnly(range?.from),
    end: formatDateOnly(range?.to),
  }
}

export function dateRangeFromStored(start?: string | null, end?: string | null) {
  const from = parseDateOnly(start)
  const to = parseDateOnly(end)
  if (!from && !to) return undefined
  return { from, to }
}
