import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardHeader, CardTitle } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  AdminEmailFilters,
  AdminEmailsSearchParams,
} from "@/features/admin/emails/admin-emails-queries"
import { EMAIL_TYPE_OPTIONS, emailTypeLabel } from "@/features/admin/emails/email-labels"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { adminDateRangePresets } from "@/features/admin/shared/admin-date-range-presets"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"

type AdminEmailsFiltersProps = {
  filters: AdminEmailFilters
  total: number
  onPatchSearch: (patch: Partial<AdminEmailsSearchParams>) => void
}

export function AdminEmailsFilters({ filters, total, onPatchSearch }: AdminEmailsFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(filters.search ?? "")
  const debouncedSearch = useDebouncedValue(searchDraft)

  useEffect(() => {
    setSearchDraft(filters.search ?? "")
  }, [filters.search])

  useEffect(() => {
    const nextSearch = debouncedSearch.trim()
    if (nextSearch === (filters.search ?? "")) return
    onPatchSearch({ q: nextSearch || undefined, page: 1 })
  }, [debouncedSearch, filters.search, onPatchSearch])

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ label: string; clear: () => void }> = []
    if (filters.purchaseId) {
      chips.push({
        label: `Compra #${filters.purchaseId}`,
        clear: () => onPatchSearch({ purchase: undefined, page: 1 }),
      })
    }
    if (filters.status !== "all") {
      chips.push({
        label: `Estado: ${filters.status}`,
        clear: () => onPatchSearch({ status: undefined, page: 1 }),
      })
    }
    if (filters.emailType !== "all") {
      chips.push({
        label: `Tipo: ${emailTypeLabel(filters.emailType)}`,
        clear: () => onPatchSearch({ type: undefined, page: 1 }),
      })
    }
    if (filters.search) {
      chips.push({
        label: `Búsqueda: ${filters.search}`,
        clear: () => {
          setSearchDraft("")
          onPatchSearch({ q: undefined, page: 1 })
        },
      })
    }
    if (filters.start || filters.end) {
      chips.push({
        label: `${filters.start ?? "…"} – ${filters.end ?? "…"}`,
        clear: () => onPatchSearch({ start: undefined, end: undefined, page: 1 }),
      })
    }
    return chips
  }, [filters, onPatchSearch])

  return (
    <CardHeader className="gap-3 border-b p-3 sm:p-4">
      <div>
        <CardTitle className="text-base">Historial</CardTitle>
        <p className="text-xs text-muted-foreground tabular-nums">
          {total.toLocaleString("es-VE")} registro{total === 1 ? "" : "s"}
        </p>
      </div>

      {activeFilterChips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {activeFilterChips.map((chip) => (
            <Badge key={chip.label} variant="secondary" className="gap-1 pr-1">
              {chip.label}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label={`Quitar filtro ${chip.label}`}
                onClick={chip.clear}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <InputGroup className="lg:max-w-80">
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Asunto, correo, cliente o teléfono"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
          {searchDraft ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="Limpiar búsqueda"
                onClick={() => setSearchDraft("")}
              >
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Select
            value={filters.emailType}
            onValueChange={(type) =>
              onPatchSearch({ type: type === "all" ? undefined : type, page: 1 })
            }
          >
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {EMAIL_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(status) => onPatchSearch({ status, page: 1 })}
          >
            <SelectTrigger size="sm" className="w-[136px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sent">Enviados</SelectItem>
                <SelectItem value="failed">Fallidos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <DateRangePicker
            start={filters.start}
            end={filters.end}
            presets={adminDateRangePresets}
            align="end"
            size="sm"
            className="min-w-0"
            onChange={(range) =>
              onPatchSearch({
                start: range.start,
                end: range.end,
                page: 1,
              })
            }
          />

          {activeFilterChips.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchDraft("")
                onPatchSearch({
                  status: undefined,
                  type: undefined,
                  q: undefined,
                  start: undefined,
                  end: undefined,
                  purchase: undefined,
                  page: 1,
                })
              }}
            >
              Limpiar
            </Button>
          ) : null}
        </div>
      </div>
    </CardHeader>
  )
}
