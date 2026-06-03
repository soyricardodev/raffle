import { CalendarBlankIcon, XIcon } from "@phosphor-icons/react"
import { useMemo } from "react"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type AdminDateRangeFilterProps = {
  start?: string | null
  end?: string | null
  onChange: (range: { start?: string; end?: string }) => void
}

function parseDateValue(value?: string | null) {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function formatDateValue(date?: Date) {
  if (!date) return undefined
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDateLabel(value?: string | null) {
  const date = parseDateValue(value)
  if (!date) return null
  return date.toLocaleDateString("es-VE", { day: "2-digit", month: "short" })
}

export function AdminDateRangeFilter({ start, end, onChange }: AdminDateRangeFilterProps) {
  const selected = useMemo<DateRange | undefined>(
    () => ({
      from: parseDateValue(start),
      to: parseDateValue(end),
    }),
    [start, end],
  )

  const hasValue = Boolean(start || end)
  const label = hasValue
    ? [formatDateLabel(start) ?? "Inicio", formatDateLabel(end) ?? "Fin"].join(" - ")
    : "Fechas"

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="min-w-0 justify-start">
            <CalendarBlankIcon data-icon="inline-start" />
            <span className="truncate">{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-2">
          <Calendar
            mode="range"
            selected={selected}
            numberOfMonths={2}
            captionLayout="dropdown"
            onSelect={(range) =>
              onChange({
                start: formatDateValue(range?.from),
                end: formatDateValue(range?.to),
              })
            }
          />
        </PopoverContent>
      </Popover>
      {hasValue ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Limpiar rango de fechas"
          onClick={() => onChange({})}
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  )
}
