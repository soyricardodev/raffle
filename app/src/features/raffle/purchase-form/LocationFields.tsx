import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  type CustomerLocationType,
  VENEZUELA_STATES,
} from "@raffle/shared/validators"

type LocationFieldsProps = {
  locationType: CustomerLocationType
  selectedState: string
  customLocation: string
  disabled: boolean
  locationError?: string
  onLocationTypeChange: (type: CustomerLocationType) => void
  onSelectedStateChange: (state: string) => void
  onCustomLocationChange: (value: string) => void
}

export function LocationFields({
  locationType,
  selectedState,
  customLocation,
  disabled,
  locationError,
  onLocationTypeChange,
  onSelectedStateChange,
  onCustomLocationChange,
}: LocationFieldsProps) {
  return (
    <Field data-invalid={!!locationError}>
      <FieldLabel htmlFor={locationType === "venezuela" ? "customer-state" : "customer-location-other"}>
        Ubicación
      </FieldLabel>
      <ToggleGroup
        type="single"
        value={locationType}
        onValueChange={(type) => {
          if (type) onLocationTypeChange(type as CustomerLocationType)
        }}
        variant="outline"
        size="sm"
        spacing={1}
        className="w-full"
        disabled={disabled}
      >
        <ToggleGroupItem value="venezuela" className="flex-1 text-xs">
          VE
        </ToggleGroupItem>
        <ToggleGroupItem value="other" className="flex-1 text-xs">
          Otro
        </ToggleGroupItem>
      </ToggleGroup>
      {locationType === "venezuela" ? (
        <Select
          value={selectedState || undefined}
          onValueChange={onSelectedStateChange}
          disabled={disabled}
        >
          <SelectTrigger
            id="customer-state"
            className="h-9 w-full"
            aria-invalid={!!locationError}
          >
            <SelectValue placeholder="Estado" />
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
        <Input
          id="customer-location-other"
          value={customLocation}
          onChange={(event) => onCustomLocationChange(event.target.value)}
          disabled={disabled}
          aria-invalid={!!locationError}
          className="h-9"
          placeholder="País, ciudad"
          maxLength={100}
        />
      )}
      <FieldError>{locationError}</FieldError>
    </Field>
  )
}
