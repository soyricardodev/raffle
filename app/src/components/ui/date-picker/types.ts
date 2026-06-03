import type { DateRange } from "react-day-picker"

export type DateTimePreset = {
  label: string
  getValue: () => Date
}

export type DateRangePreset = {
  label: string
  getRange: () => DateRange
}

export type StoredDateRange = {
  start?: string
  end?: string
}
