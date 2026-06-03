import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PickerFooterProps = {
  onCancel: () => void
  onApply: () => void
  applyDisabled?: boolean
  applyLabel?: string
  onClear?: () => void
  className?: string
}

export function PickerFooter({
  onCancel,
  onApply,
  applyDisabled,
  applyLabel = "Listo",
  onClear,
  className,
}: PickerFooterProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2 border-t p-2", className)}>
      {onClear ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Limpiar
        </Button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" size="sm" disabled={applyDisabled} onClick={onApply}>
          {applyLabel}
        </Button>
      </div>
    </div>
  )
}
