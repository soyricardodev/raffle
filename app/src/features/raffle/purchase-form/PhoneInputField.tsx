import { PhoneIcon } from "@phosphor-icons/react"
import { sanitizePhoneInput } from "@raffle/shared/validators"
import { memo } from "react"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { FieldReadyMark } from "@/features/raffle/purchase-form/FieldReadyMark"
import {
  fieldReadyInputClassName,
  formInputHeightClassName,
} from "@/features/raffle/purchase-form/field-styles"
import { cn } from "@/lib/utils"

type PhoneInputFieldProps = {
  value: string
  disabled?: boolean
  error?: string
  success?: boolean
  onChange: (value: string) => void
}

export const PhoneInputField = memo(function PhoneInputField({
  value,
  disabled,
  error,
  success,
  onChange,
}: PhoneInputFieldProps) {
  const ready = Boolean(success) && !error

  return (
    <Field data-invalid={!!error} className="gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor="customer-phone">Teléfono</FieldLabel>
        <FieldReadyMark visible={ready} />
      </div>

      <InputGroup className={cn(formInputHeightClassName, "font-mono", ready && fieldReadyInputClassName)}>
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
