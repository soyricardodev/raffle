import {
  getFieldsForType,
  getPaymentMethodCurrency,
  PAYMENT_METHOD_DEFINITIONS,
} from "./definitions.js"
import { normalizeAccountInfoKeys } from "./normalize.js"
import type { PaymentMethod } from "./types.js"

export function paymentMethodDisplayLabel(method: {
  label?: string | null
  method_type: PaymentMethod
}): string {
  if (method.label) return method.label
  return PAYMENT_METHOD_DEFINITIONS[method.method_type]?.label ?? method.method_type
}

export function paymentMethodTypeLabel(methodType: PaymentMethod): string {
  return PAYMENT_METHOD_DEFINITIONS[methodType]?.label ?? methodType.replace(/_/g, " ")
}

export function paymentMethodCurrencyLabel(methodType: PaymentMethod): "USD" | "Bs" {
  return getPaymentMethodCurrency(methodType) === "USD" ? "USD" : "Bs"
}

export type DisplayLine = { label: string; value: string }

export function formatAccountInfoForDisplay(
  methodType: PaymentMethod,
  raw: Record<string, string> | string,
): DisplayLine[] {
  let info: Record<string, string>
  if (typeof raw === "string") {
    try {
      info = JSON.parse(raw) as Record<string, string>
    } catch {
      return []
    }
  } else {
    info = raw
  }

  const normalized = normalizeAccountInfoKeys(methodType, info)
  const fields = getFieldsForType(methodType)
  const lines: DisplayLine[] = []

  for (const field of fields) {
    if (field.key === "cedula_type" || field.key === "cedula_number") continue
    const value = normalized[field.key]
    if (!value) continue
    lines.push({ label: field.label, value })
  }

  const cedulaType = normalized.cedula_type
  const cedulaNumber = normalized.cedula_number
  if (cedulaType && cedulaNumber) {
    lines.push({
      label: "Cédula",
      value: `${cedulaType}-${cedulaNumber}`,
    })
  } else if (normalized.cedula) {
    lines.push({ label: "Cédula", value: normalized.cedula })
  }

  return lines
}

export function summarizeAccountInfo(
  methodType: PaymentMethod,
  raw: Record<string, string> | string,
): string {
  const lines = formatAccountInfoForDisplay(methodType, raw)
  if (lines.length === 0) return "—"
  return lines
    .slice(0, 2)
    .map((l) => l.value)
    .join(" · ")
}
