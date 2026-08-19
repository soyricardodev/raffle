import { CaretDownIcon, CheckIcon, MagnifyingGlassIcon } from "@phosphor-icons/react"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  fieldReadyInputClassName,
  formInputHeightClassName,
} from "@/features/raffle/purchase-form/field-styles"
import { cn } from "@/lib/utils"

export type SearchableSelectOption = {
  value: string
  label: string
  keywords?: string
}

type SearchableSelectProps = {
  id?: string
  value: string
  options: readonly SearchableSelectOption[]
  placeholder: string
  searchPlaceholder: string
  emptyText?: string
  disabled?: boolean
  invalid?: boolean
  ready?: boolean
  onValueChange: (value: string) => void
}

function filterKey(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim()
}

export function SearchableSelect({
  id,
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyText = "Sin resultados",
  disabled = false,
  invalid = false,
  ready = false,
  onValueChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const selected = options.find((option) => option.value === value)

  const filtered = useMemo(() => {
    const needle = filterKey(query)
    if (!needle) return options
    return options.filter((option) => {
      const haystack = filterKey(`${option.label} ${option.keywords ?? ""} ${option.value}`)
      return haystack.includes(needle)
    })
  }, [options, query])

  useEffect(() => {
    if (!open) {
      setQuery("")
      return
    }
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  return (
    <Popover
      modal
      open={open}
      onOpenChange={(next) => {
        if (disabled) return
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={invalid}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            formInputHeightClassName,
            "flex w-full items-center justify-between gap-1.5 rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-left text-sm outline-none",
            "transition-[color,box-shadow,background-color]",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
            ready && fieldReadyInputClassName,
            !selected && "text-muted-foreground",
          )}
        >
          <span className="min-w-0 truncate">{selected?.label ?? placeholder}</span>
          <CaretDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] gap-2 p-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="relative">
          <MagnifyingGlassIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-controls={listId}
            className="h-10 rounded-2xl pl-9"
          />
        </div>
        <ScrollArea className="h-56">
          <div id={listId} role="listbox" className="flex flex-col gap-0.5 pr-2">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground px-3 py-6 text-center text-sm">{emptyText}</p>
            ) : (
              filtered.map((option) => {
                const isSelected = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "flex min-h-10 w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left text-sm",
                      isSelected
                        ? "bg-foreground/10 font-medium"
                        : "hover:bg-foreground/8 focus-visible:bg-foreground/8",
                    )}
                    onClick={() => {
                      onValueChange(option.value)
                      setOpen(false)
                    }}
                  >
                    <span className="min-w-0 leading-snug">{option.label}</span>
                    {isSelected ? <CheckIcon className="size-4 shrink-0" aria-hidden /> : null}
                  </button>
                )
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
