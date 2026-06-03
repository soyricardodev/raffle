import { IdentificationBadgeIcon } from "@phosphor-icons/react"
import { type CedulaPrefix, sanitizeCiDigits } from "@raffle/shared/validators"
import { memo } from "react"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  formInputHeightClassName,
  segmentToggleItemClassName,
} from "@/features/raffle/purchase-form/field-styles"
import { cn } from "@/lib/utils"

const PREFIXES: CedulaPrefix[] = ["V", "E", "J"]

const PREFIX_LABELS: Record<CedulaPrefix, string> = {
  V: "Venezolano",
  E: "Extranjero",
  J: "Jurídico",
}

type CiInputFieldProps = {
  prefix: CedulaPrefix
  number: string
  disabled?: boolean
  error?: string
  onPrefixChange: (prefix: CedulaPrefix) => void
  onNumberChange: (number: string) => void
}

export const CiInputField = memo(function CiInputField({
  prefix,
  number,
  disabled,
  error,
  onPrefixChange,
  onNumberChange,
}: CiInputFieldProps) {
  function handlePrefixChange(value: string) {
    if (!value) return
    onPrefixChange(value as CedulaPrefix)
  }

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="customer-ci-number">Cédula de identidad</FieldLabel>
      <FieldDescription>
        Tipo {PREFIX_LABELS[prefix].toLowerCase()} · solo números, sin puntos ni guiones.
      </FieldDescription>
      <InputGroup className={formInputHeightClassName}>
        <InputGroupAddon align="inline-start" className="px-1">
          <ToggleGroup
            type="single"
            value={prefix}
            onValueChange={handlePrefixChange}
            variant="outline"
            size="sm"
            spacing={0}
            disabled={disabled}
            aria-label="Tipo de cédula"
          >
            {PREFIXES.map((p) => (
              <ToggleGroupItem
                key={p}
                value={p}
                aria-label={PREFIX_LABELS[p]}
                title={PREFIX_LABELS[p]}
                className={cn("min-w-9 px-2.5 text-xs font-semibold", segmentToggleItemClassName)}
              >
                {p}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </InputGroupAddon>
        <InputGroupInput
          id="customer-ci-number"
          inputMode="numeric"
          autoComplete="off"
          placeholder="12345678"
          value={number}
          disabled={disabled}
          aria-invalid={!!error}
          onChange={(event) => onNumberChange(sanitizeCiDigits(event.target.value))}
        />
        <InputGroupAddon align="inline-end" className="pr-3">
          <IdentificationBadgeIcon className="size-4" aria-hidden />
        </InputGroupAddon>
      </InputGroup>
      <FieldError>{error}</FieldError>
    </Field>
  )
})
