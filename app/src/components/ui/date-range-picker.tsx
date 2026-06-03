"use client"

import { CalendarBlankIcon, XIcon } from "@phosphor-icons/react"
import type { ComponentProps } from "react"
import { useEffect, useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import { es } from "react-day-picker/locale"
import { PickerFooter } from "@/components/ui/date-picker/picker-footer"
import { PickerPresetBar } from "@/components/ui/date-picker/picker-preset-bar"
import type { DateRangePreset, StoredDateRange } from "@/components/ui/date-picker/types"
import { useLocalTimeZone } from "@/components/ui/date-picker/use-local-time-zone"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  dateRangeFromStored,
  formatDateRangeLabel,
  storedRangeFromDateRange,
} from "@/lib/date-input"
import { cn } from "@/lib/utils"

export type { DateRangePreset, StoredDateRange } from "@/components/ui/date-picker/types"

type DateRangePickerProps = {
  start?: string | null
  end?: string | null
  onChange: (range: StoredDateRange) => void
  placeholder?: string
  className?: string
  align?: "start" | "center" | "end"
  size?: ComponentProps<typeof Button>["size"]
  presets?: DateRangePreset[]
  clearable?: boolean
}

export function DateRangePicker({
  start,
  end,
  onChange,
  placeholder = "Fechas",
  className,
  align = "start",
  size = "default",
  presets,
  clearable = true,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(() => dateRangeFromStored(start, end))
  const timeZone = useLocalTimeZone()

  const committed = dateRangeFromStored(start, end)
  const hasValue = Boolean(start || end)
  const label = hasValue ? formatDateRangeLabel(start, end) : placeholder

  useEffect(() => {
    if (!open) return
    setDraft(dateRangeFromStored(start, end))
  }, [open, start, end])

  const defaultMonth = useMemo(
    () => draft?.from ?? draft?.to ?? committed?.from ?? new Date(),
    [draft, committed],
  )

  const presetActions = useMemo(
    () =>
      presets?.map((preset) => ({
        label: preset.label,
        onSelect: () => setDraft(preset.getRange()),
      })) ?? [],
    [presets],
  )

  function applyRange(range?: DateRange) {
    onChange(storedRangeFromDateRange(range))
    setOpen(false)
  }

  function clearRange() {
    onChange({})
    setOpen(false)
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size={size}
            data-empty={!hasValue}
            className="min-w-0 flex-1 justify-start font-normal data-[empty=true]:text-muted-foreground"
          >
            <CalendarBlankIcon data-icon="inline-start" />
            <span className="truncate">{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align={align}>
          <PickerPresetBar presets={presetActions} />
          <Calendar
            mode="range"
            locale={es}
            timeZone={timeZone}
            selected={draft}
            defaultMonth={defaultMonth}
            numberOfMonths={2}
            captionLayout="dropdown"
            fixedWeeks
            onSelect={setDraft}
          />
          <PickerFooter
            onCancel={() => setOpen(false)}
            onApply={() => applyRange(draft)}
            applyLabel="Aplicar"
            applyDisabled={!draft?.from}
            onClear={clearRange}
          />
        </PopoverContent>
      </Popover>
      {clearable && hasValue ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Limpiar rango de fechas"
          onClick={clearRange}
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  )
}
