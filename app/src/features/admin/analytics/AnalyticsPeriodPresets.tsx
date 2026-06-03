import { ANALYTICS_PERIOD_PRESETS } from "@raffle/shared/analytics"
import type { AnalyticsPeriodState } from "@raffle/shared/analytics"
import { Button } from "@/components/ui/button"

type AnalyticsPeriodPresetsProps = {
  value: AnalyticsPeriodState
  onChange: (value: AnalyticsPeriodState) => void
}

export function AnalyticsPeriodPresets({ value, onChange }: AnalyticsPeriodPresetsProps) {
  const presetDays = value.kind === "preset" ? value.days : null

  return (
    <div className="flex flex-wrap gap-2">
      {ANALYTICS_PERIOD_PRESETS.map((period) => (
        <Button
          key={period.label}
          size="sm"
          variant={value.kind === "preset" && presetDays === period.days ? "default" : "outline"}
          className="min-h-11"
          onClick={() => onChange({ kind: "preset", days: period.days })}
        >
          {period.label}
        </Button>
      ))}
    </div>
  )
}
