import type { ReactNode } from "react"
import { memo } from "react"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { FieldReadyMark } from "@/features/raffle/purchase-form/FieldReadyMark"
import {
  fieldReadyInputClassName,
  formInputHeightClassName,
} from "@/features/raffle/purchase-form/field-styles"
import { cn } from "@/lib/utils"

type LabeledIconFieldProps = {
  id: string
  label: string
  description?: string
  icon: ReactNode
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
  success?: boolean
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
  success,
  type = "text",
  placeholder,
  autoComplete,
}: LabeledIconFieldProps) {
  const ready = Boolean(success) && !error

  return (
    <Field data-invalid={!!error} className="gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldReadyMark visible={ready} />
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <InputGroup className={cn(formInputHeightClassName, ready && fieldReadyInputClassName)}>
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
