import { PhoneIcon } from "@phosphor-icons/react"
import {
  applyVenezuelanMobilePrefix,
  type CountryScope,
  parseVenezuelanMobilePrefix,
  phoneDisplayValue,
  sanitizePhoneInput,
  transitionPhoneScope,
  updateVenezuelanMobileSuffix,
  VENEZUELAN_MOBILE_PREFIXES,
  type VenezuelanMobilePrefix,
} from "@raffle/shared/validators"
import { memo } from "react"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CountryScopeToggle } from "@/features/raffle/purchase-form/CountryScopeToggle"
import {
  formInputHeightClassName,
  prefixToggleItemClassName,
} from "@/features/raffle/purchase-form/field-styles"
import { cn } from "@/lib/utils"

type PhoneInputFieldProps = {
  value: string
  mode: CountryScope
  disabled?: boolean
  error?: string
  onChange: (value: string) => void
  onModeChange: (mode: CountryScope) => void
}

export const PhoneInputField = memo(function PhoneInputField({
  value,
  mode,
  disabled,
  error,
  onChange,
  onModeChange,
}: PhoneInputFieldProps) {
  const activePrefix = mode === "venezuela" ? parseVenezuelanMobilePrefix(value) : null

  function switchMode(nextMode: CountryScope) {
    onModeChange(nextMode)
    onChange(transitionPhoneScope(value, nextMode))
  }

  function handlePrefixChange(prefix: string) {
    if (!prefix) return
    onModeChange("venezuela")
    onChange(applyVenezuelanMobilePrefix(value, prefix as VenezuelanMobilePrefix))
  }

  function handlePhoneChange(raw: string) {
    if (raw.trim().startsWith("+") && mode !== "other") {
      onModeChange("other")
      onChange(sanitizePhoneInput(raw, "other"))
      return
    }

    if (mode === "venezuela") {
      onChange(updateVenezuelanMobileSuffix(value, raw, activePrefix))
      return
    }

    onChange(sanitizePhoneInput(raw, mode))
  }

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="customer-phone">Teléfono</FieldLabel>
      <FieldDescription>
        {mode === "venezuela"
          ? "Elige tu operador y escribe los 7 dígitos restantes."
          : "Incluye el código de país, por ejemplo +57…"}
      </FieldDescription>

      <CountryScopeToggle
        value={mode}
        onChange={switchMode}
        disabled={disabled}
        ariaLabel="Tipo de teléfono"
      />

      {mode === "venezuela" ? (
        <ToggleGroup
          type="single"
          value={activePrefix ?? ""}
          onValueChange={handlePrefixChange}
          variant="outline"
          size="sm"
          spacing={0}
          className="grid w-full grid-cols-3 sm:grid-cols-5"
          disabled={disabled}
          aria-label="Operador móvil"
        >
          {VENEZUELAN_MOBILE_PREFIXES.map((prefix) => (
            <ToggleGroupItem
              key={prefix}
              value={prefix}
              aria-label={`Operador ${prefix}`}
              className={prefixToggleItemClassName}
            >
              {prefix}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : null}

      <InputGroup className={cn(formInputHeightClassName, mode === "other" && "font-mono")}>
        <InputGroupAddon align="inline-start">
          <PhoneIcon className="size-4" aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          id="customer-phone"
          type="tel"
          inputMode={mode === "other" ? "tel" : "numeric"}
          autoComplete="tel"
          placeholder={mode === "other" ? "+58 412 1234567" : "1234567"}
          value={phoneDisplayValue(mode, value)}
          disabled={disabled}
          aria-invalid={!!error}
          onChange={(event) => handlePhoneChange(event.target.value)}
        />
      </InputGroup>
      <FieldError>{error}</FieldError>
    </Field>
  )
})
