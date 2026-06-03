import type { AnalyticsPeriodState } from "@raffle/shared/analytics"
import { Download } from "@phosphor-icons/react"
import { AnalyticsPeriodPresets } from "@/features/admin/analytics/AnalyticsPeriodPresets"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { adminDateRangePresets } from "@/features/admin/shared/admin-date-range-presets"

type AnalyticsPeriodFilterProps = {
  value: AnalyticsPeriodState
  onChange: (value: AnalyticsPeriodState) => void
  onExport?: () => void
  exportDisabled?: boolean
}

export function AnalyticsPeriodFilter({
  value,
  onChange,
  onExport,
  exportDisabled,
}: AnalyticsPeriodFilterProps) {
  const customStart = value.kind === "custom" ? value.from : undefined
  const customEnd = value.kind === "custom" ? value.to : undefined

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <AnalyticsPeriodPresets value={value} onChange={onChange} />
        <DateRangePicker
          start={customStart}
          end={customEnd}
          presets={adminDateRangePresets}
          placeholder="Rango personalizado"
          size="sm"
          className="min-w-0"
          onChange={(range) => {
            if (!range.start && !range.end) {
              if (value.kind === "custom") {
                onChange({ kind: "preset", days: 30 })
              }
              return
            }
            if (range.start && range.end) {
              onChange({ kind: "custom", from: range.start, to: range.end })
            }
          }}
        />
        {onExport ? (
          <Button
            size="sm"
            variant="outline"
            className="min-h-11"
            disabled={exportDisabled}
            onClick={onExport}
          >
            <Download data-icon="inline-start" />
            CSV
          </Button>
        ) : null}
      </div>
    </div>
  )
}
