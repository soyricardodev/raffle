"use client"

import { CalendarBlankIcon, XIcon } from "@phosphor-icons/react"
import { setHours, setMinutes } from "date-fns"
import { useEffect, useMemo, useState } from "react"
import { es } from "react-day-picker/locale"
import { PickerFooter } from "@/components/ui/date-picker/picker-footer"
import { PickerPresetBar } from "@/components/ui/date-picker/picker-preset-bar"
import type { DateTimePreset } from "@/components/ui/date-picker/types"
import { useLocalTimeZone } from "@/components/ui/date-picker/use-local-time-zone"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SimpleTimePicker } from "@/components/ui/simple-time-picker"
import {
  formatDatetimeLocal,
  formatDatetimePickerLabel,
  isCalendarDayBeforeDate,
  parseDatetimeLocal,
} from "@/lib/date-input"
import { cn } from "@/lib/utils"

export type { DateTimePreset } from "@/components/ui/date-picker/types"

type DateTimePickerProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** Earliest allowed calendar day; any time on that day is valid. */
  minDay?: Date
  className?: string
  presets?: DateTimePreset[]
  clearable?: boolean
  "aria-invalid"?: boolean
}

function defaultDraft(minDay?: Date): Date {
  const anchor = minDay ?? new Date()
  return setMinutes(setHours(anchor, 12), 0)
}

export function DateTimePicker({
  id,
  value,
  onChange,
  placeholder = "Seleccionar fecha y hora",
  disabled,
  minDay,
  className,
  presets,
  clearable = true,
  "aria-invalid": ariaInvalid,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Date>(() => defaultDraft(minDay))
  const [month, setMonth] = useState<Date>(() => defaultDraft(minDay))
  const [commitError, setCommitError] = useState<string | null>(null)
  const timeZone = useLocalTimeZone()

  const selected = parseDatetimeLocal(value)
  const minDayMs = minDay?.getTime()

  useEffect(() => {
    if (!open) return
    const next = parseDatetimeLocal(value) ?? defaultDraft(minDay)
    setDraft(next)
    setMonth(next)
    setCommitError(null)
  }, [open, value, minDayMs, minDay])

  const triggerLabel = useMemo(
    () => (selected ? formatDatetimePickerLabel(selected) : placeholder),
    [selected, placeholder],
  )

  const presetActions = useMemo(
    () =>
      presets?.map((preset) => ({
        label: preset.label,
        onSelect: () => {
          setDraft(preset.getValue())
          setCommitError(null)
        },
      })) ?? [],
    [presets],
  )

  function commit(next: Date) {
    if (minDay && isCalendarDayBeforeDate(next, minDay)) {
      setCommitError("La fecha no puede ser anterior a hoy")
      return
    }
    onChange(formatDatetimeLocal(next))
    setOpen(false)
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id={id}
            variant="outline"
            disabled={disabled}
            aria-invalid={ariaInvalid}
            data-empty={!selected}
            className="min-h-11 min-w-0 flex-1 justify-start font-normal data-[empty=true]:text-muted-foreground"
          >
            <CalendarBlankIcon data-icon="inline-start" />
            <span className="truncate">{triggerLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <PickerPresetBar presets={presetActions} />
          <Calendar
            mode="single"
            locale={es}
            timeZone={timeZone}
            selected={draft}
            month={month}
            onMonthChange={setMonth}
            captionLayout="dropdown"
            fixedWeeks
            disabled={minDay ? { before: minDay } : undefined}
            onSelect={(date) => {
              if (!date) return
              setDraft(setMinutes(setHours(date, draft.getHours()), draft.getMinutes()))
              setCommitError(null)
            }}
          />
          <SimpleTimePicker value={draft} onChange={setDraft} />
          {commitError ? (
            <p className="text-destructive px-3 pb-1 text-xs">{commitError}</p>
          ) : null}
          <PickerFooter
            onCancel={() => setOpen(false)}
            onApply={() => commit(draft)}
            applyLabel="Listo"
          />
        </PopoverContent>
      </Popover>
      {clearable && selected && !disabled ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Limpiar fecha y hora"
          onClick={() => onChange("")}
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  )
}
