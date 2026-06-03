import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PickerPresetBarProps = {
  presets: { label: string; onSelect: () => void }[]
  className?: string
}

export function PickerPresetBar({ presets, className }: PickerPresetBarProps) {
  if (presets.length === 0) return null

  return (
    <div className={cn("flex flex-wrap gap-1 border-b p-2", className)}>
      {presets.map((preset) => (
        <Button
          key={preset.label}
          type="button"
          variant="outline"
          size="sm"
          onClick={preset.onSelect}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  )
}
