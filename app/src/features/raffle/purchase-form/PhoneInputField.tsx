import { PhoneIcon } from "@phosphor-icons/react"
import { sanitizePhoneInput } from "@raffle/shared/validators"
import { memo } from "react"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { formInputHeightClassName } from "@/features/raffle/purchase-form/field-styles"
import { cn } from "@/lib/utils"

type PhoneInputFieldProps = {
  value: string
  disabled?: boolean
  error?: string
  onChange: (value: string) => void
}

export const PhoneInputField = memo(function PhoneInputField({
  value,
  disabled,
  error,
  onChange,
}: PhoneInputFieldProps) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="customer-phone">Teléfono</FieldLabel>
      <FieldDescription>Nacional o internacional. Ejemplo: +58 o 0412.</FieldDescription>

      <InputGroup className={cn(formInputHeightClassName, "font-mono")}>
        <InputGroupAddon align="inline-start">
          <PhoneIcon className="size-4" aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          id="customer-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Ej. +58 412 1234567 o 0412 1234567"
          value={value}
          disabled={disabled}
          aria-invalid={!!error}
          onChange={(event) => onChange(sanitizePhoneInput(event.target.value))}
        />
      </InputGroup>
      <FieldError>{error}</FieldError>
    </Field>
  )
})
