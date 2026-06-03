import {
  emptyAccountInfoDraft,
  getFieldsForType,
  listCreatablePaymentMethodTypes,
  PAYMENT_METHOD_DEFINITIONS,
  safeParseAccountInfo,
} from "@raffle/shared/payment-methods"
import { PaymentMethod } from "@raffle/shared/validators"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type PaymentAccountFormValues = {
  label: string
  method_type: PaymentMethod
  account_info: Record<string, string>
  is_active: boolean
}

type PaymentAccountFormProps = {
  initial: PaymentAccountFormValues
  onSubmit: (values: PaymentAccountFormValues) => void
  onCancel: () => void
  isPending?: boolean
  allowLegacyTypes?: boolean
}

export function PaymentAccountForm({
  initial,
  onSubmit,
  onCancel,
  isPending = false,
  allowLegacyTypes = false,
}: PaymentAccountFormProps) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const typeOptions = useMemo(() => {
    const codes = allowLegacyTypes
      ? (PaymentMethod.options as PaymentMethod[])
      : listCreatablePaymentMethodTypes()
    return codes
  }, [allowLegacyTypes])

  const fields = getFieldsForType(values.method_type)
  const definition = PAYMENT_METHOD_DEFINITIONS[values.method_type]

  function patchAccountField(key: string, value: string) {
    setValues((prev) => ({
      ...prev,
      account_info: { ...prev.account_info, [key]: value },
    }))
  }

  function handleTypeChange(methodType: PaymentMethod) {
    setValues((prev) => ({
      ...prev,
      method_type: methodType,
      account_info: emptyAccountInfoDraft(methodType),
    }))
    setErrors({})
  }

  function handleSubmit() {
    const next: Record<string, string> = {}
    if (!values.label.trim()) next.label = "Nombre requerido"

    const parsed = safeParseAccountInfo(values.method_type, values.account_info)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".") || "account"
        next[path] = issue.message
      }
    }

    setErrors(next)
    if (Object.keys(next).length > 0) return

    onSubmit({
      ...values,
      label: values.label.trim(),
      account_info: parsed.success ? parsed.data : values.account_info,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field data-invalid={!!errors.label}>
        <FieldLabel htmlFor="account-label">Nombre</FieldLabel>
        <Input
          id="account-label"
          className="min-h-11"
          placeholder="Ej. Zelle personal"
          value={values.label}
          onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
        />
        <FieldDescription>
          Cómo lo identificas en el panel (no lo ve el comprador).
        </FieldDescription>
        {errors.label ? (
          <FieldDescription className="text-destructive">{errors.label}</FieldDescription>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor="account-type">Tipo</FieldLabel>
        <Select
          value={values.method_type}
          onValueChange={(v) => handleTypeChange(v as PaymentMethod)}
        >
          <SelectTrigger id="account-type" className="min-h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((code) => (
              <SelectItem key={code} value={code}>
                {PAYMENT_METHOD_DEFINITIONS[code].label}
                {PAYMENT_METHOD_DEFINITIONS[code].currency === "USD" ? " (USD)" : " (Bs)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => {
          const fieldError = errors[field.key]
          if (field.input === "select" && field.options) {
            return (
              <Field key={field.key} data-invalid={!!fieldError}>
                <FieldLabel htmlFor={`field-${field.key}`}>{field.label}</FieldLabel>
                <Select
                  value={values.account_info[field.key] ?? ""}
                  onValueChange={(v) => patchAccountField(field.key, v)}
                >
                  <SelectTrigger id={`field-${field.key}`} className="min-h-11 w-full">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError ? (
                  <FieldDescription className="text-destructive">{fieldError}</FieldDescription>
                ) : null}
              </Field>
            )
          }

          return (
            <Field
              key={field.key}
              className={field.key === "email" ? "sm:col-span-2" : undefined}
              data-invalid={!!fieldError}
            >
              <FieldLabel htmlFor={`field-${field.key}`}>
                {field.label}
                {!field.required ? " (opcional)" : ""}
              </FieldLabel>
              <Input
                id={`field-${field.key}`}
                type={field.input === "email" ? "email" : field.input === "tel" ? "tel" : "text"}
                inputMode={
                  field.input === "digits" || field.input === "tel" ? "numeric" : undefined
                }
                className="min-h-11"
                placeholder={field.placeholder}
                value={values.account_info[field.key] ?? ""}
                onChange={(e) => {
                  let v = e.target.value
                  if (field.pattern) {
                    v = v.replace(/\D/g, "")
                  }
                  patchAccountField(field.key, v)
                }}
              />
              {field.hint ? <FieldDescription>{field.hint}</FieldDescription> : null}
              {fieldError ? (
                <FieldDescription className="text-destructive">{fieldError}</FieldDescription>
              ) : null}
            </Field>
          )
        })}
      </div>

      <p className="text-muted-foreground text-xs">
        Moneda: {definition.currency === "USD" ? "Dólares (USD/USDT)" : "Bolívares (VES)"}
      </p>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="button" variant="outline" className="min-h-11" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="min-h-11 flex-1"
          disabled={isPending}
          onClick={handleSubmit}
        >
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  )
}
