import { MapPinIcon } from "@phosphor-icons/react"
import { type CustomerLocationType, VENEZUELA_STATES } from "@raffle/shared/validators"
import { memo } from "react"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CountryScopeToggle } from "@/features/raffle/purchase-form/CountryScopeToggle"
import { FieldReadyMark } from "@/features/raffle/purchase-form/FieldReadyMark"
import {
  fieldReadyInputClassName,
  formInputHeightClassName,
} from "@/features/raffle/purchase-form/field-styles"
import { cn } from "@/lib/utils"

type LocationFieldsProps = {
  locationType: CustomerLocationType
  selectedState: string
  customLocation: string
  disabled: boolean
  locationError?: string
  success?: boolean
  onLocationTypeChange: (type: CustomerLocationType) => void
  onSelectedStateChange: (state: string) => void
  onCustomLocationChange: (value: string) => void
}

export const LocationFields = memo(function LocationFields({
  locationType,
  selectedState,
  customLocation,
  disabled,
  locationError,
  success,
  onLocationTypeChange,
  onSelectedStateChange,
  onCustomLocationChange,
}: LocationFieldsProps) {
  const ready = Boolean(success) && !locationError

  return (
    <Field data-invalid={!!locationError} className="gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel
          htmlFor={locationType === "venezuela" ? "customer-state" : "customer-location-other"}
        >
          Ubicación
        </FieldLabel>
        <FieldReadyMark visible={ready} />
      </div>

      <CountryScopeToggle
        value={locationType}
        onChange={onLocationTypeChange}
        disabled={disabled}
        ariaLabel="Tipo de ubicación"
      />

      {locationType === "venezuela" ? (
        <Select
          value={selectedState || undefined}
          onValueChange={onSelectedStateChange}
          disabled={disabled}
        >
          <SelectTrigger
            id="customer-state"
            className={cn(formInputHeightClassName, "w-full", ready && fieldReadyInputClassName)}
            aria-invalid={!!locationError}
          >
            <SelectValue placeholder="Selecciona tu estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {VENEZUELA_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : (
        <InputGroup className={cn(formInputHeightClassName, ready && fieldReadyInputClassName)}>
          <InputGroupAddon align="inline-start">
            <MapPinIcon className="size-4" aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            id="customer-location-other"
            value={customLocation}
            onChange={(event) => onCustomLocationChange(event.target.value)}
            disabled={disabled}
            aria-invalid={!!locationError}
            placeholder="Ej. Colombia, Bogotá"
            maxLength={100}
            autoComplete="address-level2"
          />
        </InputGroup>
      )}
      <FieldError>{locationError}</FieldError>
    </Field>
  )
})
