import { cn } from "@/lib/utils"
import { VERIFY_SEARCH_METHODS } from "@/features/verify/verify-search-config"
import type { VerifySearchType } from "@/features/verify/verify-profile"

type VerifySearchMethodPickerProps = {
  value: VerifySearchType
  disabled?: boolean
  onChange: (value: VerifySearchType) => void
}

export function VerifySearchMethodPicker({
  value,
  disabled,
  onChange,
}: VerifySearchMethodPickerProps) {
  return (
    <div
      role="tablist"
      aria-label="Buscar por"
      className="border-border grid grid-cols-4 border-b"
    >
      {VERIFY_SEARCH_METHODS.map((method) => {
        const Icon = method.icon
        const active = value === method.value
        return (
          <button
            key={method.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(method.value)}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-0.5 border-b-2 px-1 py-2 text-xs font-medium transition-colors sm:flex-row sm:gap-1.5 sm:text-sm",
              active
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="sm:hidden">{method.shortLabel}</span>
            <span className="hidden sm:inline">{method.label}</span>
          </button>
        )
      })}
    </div>
  )
}
