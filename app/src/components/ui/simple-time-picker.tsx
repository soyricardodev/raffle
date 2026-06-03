"use client"

import { endOfHour, endOfMinute, setHours, setMinutes, startOfHour, startOfMinute } from "date-fns"
import { useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type TimeOption = {
  value: number
  label: string
  disabled?: boolean
}

type SimpleTimePickerProps = {
  value: Date
  onChange: (date: Date) => void
  min?: Date
  max?: Date
  disabled?: boolean
  className?: string
}

function TimeColumn({
  options,
  selected,
  onSelect,
  selectedRef,
}: {
  options: TimeOption[]
  selected: number
  onSelect: (value: number) => void
  selectedRef?: React.RefObject<HTMLButtonElement | null>
}) {
  return (
    <ScrollArea className="h-40 w-14">
      <div className="flex flex-col items-stretch p-1">
        {options.map((option) => {
          const isSelected = option.value === selected
          return (
            <Button
              key={option.value}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              variant="ghost"
              size="sm"
              disabled={option.disabled}
              className={cn(
                "h-8 justify-center px-2 font-normal tabular-nums",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </Button>
          )
        })}
      </div>
    </ScrollArea>
  )
}

export function SimpleTimePicker({
  value,
  onChange,
  min,
  max,
  disabled,
  className,
}: SimpleTimePickerProps) {
  const hour = value.getHours()
  const minute = value.getMinutes()
  const hourRef = useRef<HTMLButtonElement>(null)
  const minuteRef = useRef<HTMLButtonElement>(null)

  const hours = useMemo((): TimeOption[] => {
    return Array.from({ length: 24 }, (_, index) => {
      const hourDate = setHours(value, index)
      const hourStart = startOfHour(hourDate)
      const hourEnd = endOfHour(hourDate)
      let isDisabled = false
      if (min && hourEnd < min) isDisabled = true
      if (max && hourStart > max) isDisabled = true
      return {
        value: index,
        label: index.toString().padStart(2, "0"),
        disabled: isDisabled,
      }
    })
  }, [value, min, max])

  const minutes = useMemo((): TimeOption[] => {
    const anchor = setHours(value, hour)
    return Array.from({ length: 60 }, (_, index) => {
      const minuteDate = setMinutes(anchor, index)
      const minuteStart = startOfMinute(minuteDate)
      const minuteEnd = endOfMinute(minuteDate)
      let isDisabled = false
      if (min && minuteEnd < min) isDisabled = true
      if (max && minuteStart > max) isDisabled = true
      return {
        value: index,
        label: index.toString().padStart(2, "0"),
        disabled: isDisabled,
      }
    })
  }, [value, hour, min, max])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      hourRef.current?.scrollIntoView({ block: "center" })
      minuteRef.current?.scrollIntoView({ block: "center" })
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [hour, minute])

  function updateHour(nextHour: number) {
    onChange(setMinutes(setHours(value, nextHour), minute))
  }

  function updateMinute(nextMinute: number) {
    onChange(setMinutes(value, nextMinute))
  }

  return (
    <div
      className={cn(
        "flex items-start justify-center gap-1 border-t bg-muted/30 p-2",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      aria-label="Seleccionar hora"
    >
      <TimeColumn options={hours} selected={hour} onSelect={updateHour} selectedRef={hourRef} />
      <span className="text-muted-foreground self-center text-sm font-medium">:</span>
      <TimeColumn
        options={minutes}
        selected={minute}
        onSelect={updateMinute}
        selectedRef={minuteRef}
      />
    </div>
  )
}
