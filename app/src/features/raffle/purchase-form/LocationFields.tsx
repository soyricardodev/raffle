import { MapPinIcon } from "@phosphor-icons/react"
import {
  type CustomerLocationType,
  municipalitiesForState,
  municipalityPickerLabel,
  municipalitySearchText,
  singleMunicipalityName,
  VENEZUELA_STATES,
} from "@raffle/shared/validators"
import { memo, useMemo } from "react"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { CountryScopeToggle } from "@/features/raffle/purchase-form/CountryScopeToggle"
import { FieldReadyMark } from "@/features/raffle/purchase-form/FieldReadyMark"
import {
  fieldReadyInputClassName,
  formInputHeightClassName,
} from "@/features/raffle/purchase-form/field-styles"
import { SearchableSelect } from "@/features/raffle/purchase-form/SearchableSelect"
import { cn } from "@/lib/utils"

type LocationFieldsProps = {
  locationType: CustomerLocationType
  selectedState: string
  selectedMunicipality: string
  customLocation: string
  disabled: boolean
  locationError?: string
  success?: boolean
  onLocationTypeChange: (type: CustomerLocationType) => void
  onSelectedStateChange: (state: string) => void
  onSelectedMunicipalityChange: (municipality: string) => void
  onCustomLocationChange: (value: string) => void
  /** When false, municipality stays optional so older state-only locations can be saved. */
  requireMunicipality?: boolean
}

const STATE_OPTIONS = VENEZUELA_STATES.map((state) => ({ value: state, label: state }))

export const LocationFields = memo(function LocationFields({
  locationType,
  selectedState,
  selectedMunicipality,
  customLocation,
  disabled,
  locationError,
  success,
  onLocationTypeChange,
  onSelectedStateChange,
  onSelectedMunicipalityChange,
  onCustomLocationChange,
  requireMunicipality = true,
}: LocationFieldsProps) {
  const ready = Boolean(success) && !locationError
  const municipalityOptions = useMemo(
    () =>
      municipalitiesForState(selectedState).map((item) => ({
        value: item.name,
        label: municipalityPickerLabel(item),
        keywords: municipalitySearchText(item),
      })),
    [selectedState],
  )

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
        <div className="flex flex-col gap-2">
          <SearchableSelect
            id="customer-state"
            value={selectedState}
            options={STATE_OPTIONS}
            placeholder="Selecciona tu estado"
            searchPlaceholder="Buscar estado..."
            disabled={disabled}
            invalid={!!locationError && !selectedState}
            ready={ready}
            onValueChange={(state) => {
              onSelectedStateChange(state)
              onSelectedMunicipalityChange(singleMunicipalityName(state) ?? "")
            }}
          />
          <SearchableSelect
            id="customer-municipality"
            value={selectedMunicipality}
            options={municipalityOptions}
            placeholder={selectedState ? "Selecciona tu municipio" : "Primero elige el estado"}
            searchPlaceholder="Buscar municipio o ciudad..."
            disabled={disabled || !selectedState}
            invalid={
              !!locationError &&
              Boolean(selectedState) &&
              requireMunicipality &&
              !selectedMunicipality
            }
            ready={ready}
            onValueChange={onSelectedMunicipalityChange}
          />
          <p className="text-muted-foreground text-xs leading-snug">
            Puedes buscar por municipio o por ciudad.
          </p>
        </div>
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
