import { CheckCircleIcon, HashIcon } from "@phosphor-icons/react"
import {
  type PaymentReferenceInputMode,
  PAYMENT_REFERENCE_MAX_LENGTH,
} from "@raffle/shared/validators"
import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Progress } from "@/components/ui/progress"
import { formInputHeightClassName } from "@/features/raffle/purchase-form/field-styles"
import { cn } from "@/lib/utils"

type PaymentReferenceFieldProps = {
  value: string
  minLength: number
  inputMode: PaymentReferenceInputMode
  disabled?: boolean
  error?: string
  onChange: (value: string) => void
}

export const PaymentReferenceField = memo(function PaymentReferenceField({
  value,
  minLength,
  inputMode,
  disabled,
  error,
  onChange,
}: PaymentReferenceFieldProps) {
  const isNumeric = inputMode === "numeric"
  const trimmedLength = value.trim().length
  const isComplete = trimmedLength >= minLength
  const progressValue =
    minLength > 0 ? Math.min(100, Math.round((trimmedLength / minLength) * 100)) : 100
  const remaining = Math.max(0, minLength - trimmedLength)

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="payment-reference" className="sr-only">
        Referencia del pago
      </FieldLabel>
      <FieldDescription className="text-sm font-medium text-foreground">
        {isNumeric
          ? `Ingresa los últimos ${minLength} dígitos que aparecen en tu pago móvil.`
          : `Ingresa al menos ${minLength} caracteres de la referencia de tu transferencia.`}
      </FieldDescription>
      <InputGroup className={cn(formInputHeightClassName, "h-11")}>
        <InputGroupAddon align="inline-start">
          <HashIcon aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          id="payment-reference"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-invalid={!!error}
          className="text-base"
          placeholder={isNumeric ? `Últimos ${minLength} dígitos` : `Mín. ${minLength} caracteres`}
          inputMode={isNumeric ? "numeric" : "text"}
          autoComplete="off"
          maxLength={PAYMENT_REFERENCE_MAX_LENGTH}
        />
        <InputGroupAddon align="inline-end" className="pr-3">
          {isComplete ? (
            <Badge
              variant="secondary"
              className="gap-1 border-emerald-500/30 bg-emerald-500/15 text-emerald-800 tabular-nums dark:text-emerald-100"
            >
              <CheckCircleIcon weight="fill" className="size-3.5" aria-hidden />
              {trimmedLength}/{minLength}
            </Badge>
          ) : (
            <InputGroupText className="text-xs font-semibold tabular-nums">
              {trimmedLength}/{minLength}
            </InputGroupText>
          )}
        </InputGroupAddon>
      </InputGroup>
      <Progress
        value={progressValue}
        className={cn("h-1.5", isComplete && "[&_[data-slot=progress-indicator]]:bg-emerald-500")}
        aria-hidden
      />
      {!error && trimmedLength > 0 && !isComplete ? (
        <p className="text-muted-foreground text-xs tabular-nums">
          Faltan {remaining} {isNumeric ? "dígito" : "carácter"}
          {remaining === 1 ? "" : isNumeric ? "s" : "es"}
        </p>
      ) : null}
      {!error && isComplete ? (
        <p className="text-xs text-emerald-700 tabular-nums dark:text-emerald-300">
          {isNumeric ? `Últimos ${minLength} dígitos completos` : "Referencia completa"}
        </p>
      ) : null}
      <FieldError>{error}</FieldError>
    </Field>
  )
})
