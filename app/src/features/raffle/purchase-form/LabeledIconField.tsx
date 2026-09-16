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
  onBlur?: () => void
  disabled?: boolean
  error?: string
  /** Aviso amable bajo el campo, nunca de error. */
  note?: string
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
  onBlur,
  disabled,
  error,
  note,
  success,
  type = "text",
  placeholder,
  autoComplete,
}: LabeledIconFieldProps) {
  const ready = Boolean(success) && !error
  const isEmail = type === "email"

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
          onBlur={onBlur}
          disabled={disabled}
          aria-invalid={!!error}
          autoComplete={autoComplete}
          placeholder={placeholder}
          // En móvil el teclado capitaliza y autocorrige por su cuenta: eso es
          // la mitad de los dedazos de correo.
          inputMode={isEmail ? "email" : undefined}
          autoCapitalize={isEmail ? "none" : undefined}
          autoCorrect={isEmail ? "off" : undefined}
          spellCheck={isEmail ? false : undefined}
        />
      </InputGroup>
      {note && !error ? <FieldDescription>{note}</FieldDescription> : null}
      <FieldError>{error}</FieldError>
    </Field>
  )
})
