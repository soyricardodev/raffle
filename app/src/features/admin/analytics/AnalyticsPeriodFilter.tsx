import { ANALYTICS_PERIOD_PRESETS } from "@raffle/shared/analytics"
import type { AnalyticsPeriodState } from "@raffle/shared/analytics"
import { Download } from "lucide-react"
import { AnalyticsPeriodPresets } from "@/features/admin/analytics/AnalyticsPeriodPresets"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <AnalyticsPeriodPresets value={value} onChange={onChange} />
        {onExport ? (
          <Button
            size="sm"
            variant="outline"
            className="min-h-11"
            disabled={exportDisabled}
            onClick={onExport}
          >
            <Download className="mr-2 size-4" />
            CSV
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <Label htmlFor="analytics-from" className="text-xs">
            Desde
          </Label>
          <Input
            id="analytics-from"
            type="date"
            className="h-11 w-[160px]"
            value={value.kind === "custom" ? value.from : ""}
            onChange={(e) =>
              onChange({
                kind: "custom",
                from: e.target.value,
                to: value.kind === "custom" ? value.to : e.target.value,
              })
            }
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="analytics-to" className="text-xs">
            Hasta
          </Label>
          <Input
            id="analytics-to"
            type="date"
            className="h-11 w-[160px]"
            value={value.kind === "custom" ? value.to : ""}
            onChange={(e) =>
              onChange({
                kind: "custom",
                from: value.kind === "custom" ? value.from : e.target.value,
                to: e.target.value,
              })
            }
          />
        </div>
        <Button
          size="sm"
          variant={value.kind === "custom" ? "default" : "outline"}
          className="min-h-11"
          disabled={value.kind !== "custom" || !value.from || !value.to}
          onClick={() => {
            if (value.kind === "custom" && value.from && value.to) {
              onChange({ kind: "custom", from: value.from, to: value.to })
            }
          }}
        >
          Aplicar rango
        </Button>
      </div>
    </div>
  )
}

export { ANALYTICS_PERIOD_PRESETS }
