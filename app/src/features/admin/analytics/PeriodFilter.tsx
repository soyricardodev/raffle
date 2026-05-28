import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export const ANALYTICS_PERIODS = [
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
] as const

type PeriodFilterProps = {
  value: number
  onChange: (days: number) => void
  onExport?: () => void
  exportDisabled?: boolean
}

export function PeriodFilter({ value, onChange, onExport, exportDisabled }: PeriodFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ANALYTICS_PERIODS.map((period) => (
        <Button
          key={period.days}
          size="sm"
          variant={value === period.days ? "default" : "outline"}
          className="min-h-11"
          onClick={() => onChange(period.days)}
        >
          {period.label}
        </Button>
      ))}
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
  )
}
