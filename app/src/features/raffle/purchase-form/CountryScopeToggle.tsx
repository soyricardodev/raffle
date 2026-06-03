import { GlobeHemisphereWestIcon } from "@phosphor-icons/react"
import type { CountryScope } from "@raffle/shared/validators"
import { memo } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { segmentToggleRowClassName } from "@/features/raffle/purchase-form/field-styles"
import { VenezuelaFlagIcon } from "@/features/raffle/purchase-form/VenezuelaFlagIcon"

type CountryScopeToggleProps = {
  value: CountryScope
  onChange: (value: CountryScope) => void
  disabled?: boolean
  ariaLabel?: string
}

export const CountryScopeToggle = memo(function CountryScopeToggle({
  value,
  onChange,
  disabled,
  ariaLabel = "Alcance geográfico",
}: CountryScopeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next === "venezuela" || next === "other") onChange(next)
      }}
      variant="outline"
      size="sm"
      spacing={0}
      className="w-full"
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <ToggleGroupItem
        value="venezuela"
        aria-label="Venezuela"
        className={segmentToggleRowClassName}
      >
        <span className="flex items-center justify-center gap-1.5">
          <VenezuelaFlagIcon className="h-3.5 w-5" />
          <span className="text-xs font-medium sm:text-sm">Venezuela</span>
        </span>
      </ToggleGroupItem>
      <ToggleGroupItem value="other" aria-label="Otro país" className={segmentToggleRowClassName}>
        <span className="flex items-center justify-center gap-1.5">
          <GlobeHemisphereWestIcon className="size-4 shrink-0" aria-hidden />
          <span className="text-xs font-medium sm:text-sm">Otro país</span>
        </span>
      </ToggleGroupItem>
    </ToggleGroup>
  )
})
