import type { ReactNode } from "react"
import { memo } from "react"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { formInputHeightClassName } from "@/features/raffle/purchase-form/field-styles"

type LabeledIconFieldProps = {
  id: string
  label: string
  description: string
  icon: ReactNode
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
  type?: string
  placeholder?: string
  autoComplete?: string
}

export const LabeledIconField = memo(function LabeledIconField({
  id,
  label,
  description,
  icon,
  value,
  onChange,
  disabled,
  error,
  type = "text",
  placeholder,
  autoComplete,
}: LabeledIconFieldProps) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      <InputGroup className={formInputHeightClassName}>
        <InputGroupAddon align="inline-start">{icon}</InputGroupAddon>
        <InputGroupInput
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-invalid={!!error}
          autoComplete={autoComplete}
          placeholder={placeholder}
        />
      </InputGroup>
      <FieldError>{error}</FieldError>
    </Field>
  )
})
