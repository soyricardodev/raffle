import type { PaymentMethod } from "./types.js"

export type PaymentCurrency = "USD" | "VES"

export type FieldInputType = "text" | "email" | "tel" | "digits" | "select"

export type FieldDef = {
  key: string
  label: string
  input: FieldInputType
  required: boolean
  placeholder?: string
  options?: readonly string[]
  pattern?: RegExp
  hint?: string
}

export type PaymentMethodDefinition = {
  code: PaymentMethod
  label: string
  currency: PaymentCurrency
  /** Hide from "create new" picker but still valid for existing accounts */
  legacy?: boolean
  fields: FieldDef[]
}

const EMAIL_FIELD: FieldDef = {
  key: "email",
  label: "Correo",
  input: "email",
  required: true,
  placeholder: "correo@ejemplo.com",
}

const HOLDER_FIELD: FieldDef = {
  key: "holder_name",
  label: "Nombre del titular",
  input: "text",
  required: false,
  placeholder: "Opcional",
}

export const PAYMENT_METHOD_DEFINITIONS: Record<PaymentMethod, PaymentMethodDefinition> = {
  binance: {
    code: "binance",
    label: "Binance",
    currency: "USD",
    fields: [
      { ...EMAIL_FIELD, hint: "Pago en USD / USDT" },
    ],
  },
  zinli: {
    code: "zinli",
    label: "Zinli",
    currency: "USD",
    fields: [EMAIL_FIELD],
  },
  zelle: {
    code: "zelle",
    label: "Zelle",
    currency: "USD",
    fields: [EMAIL_FIELD, HOLDER_FIELD],
  },
  pago_movil: {
    code: "pago_movil",
    label: "Pago móvil",
    currency: "VES",
    fields: [
      {
        key: "bank",
        label: "Banco",
        input: "text",
        required: true,
        placeholder: "Ej. Banesco",
      },
      {
        key: "phone",
        label: "Teléfono",
        input: "tel",
        required: true,
        placeholder: "04121234567",
        pattern: /^\d+$/,
      },
      {
        key: "cedula_type",
        label: "Tipo de documento",
        input: "select",
        required: true,
        options: ["V", "J", "E"],
      },
      {
        key: "cedula_number",
        label: "Número de documento",
        input: "digits",
        required: true,
        placeholder: "12345678",
        pattern: /^\d+$/,
      },
    ],
  },
  bs: {
    code: "bs",
    label: "Transferencia Bs",
    currency: "VES",
    legacy: true,
    fields: [
      {
        key: "bank",
        label: "Banco",
        input: "text",
        required: true,
      },
      {
        key: "account",
        label: "Cuenta",
        input: "text",
        required: true,
      },
      {
        key: "holder",
        label: "Titular",
        input: "text",
        required: true,
      },
    ],
  },
  usd: {
    code: "usd",
    label: "Transferencia USD",
    currency: "USD",
    legacy: true,
    fields: [
      {
        key: "bank",
        label: "Banco",
        input: "text",
        required: true,
      },
      {
        key: "account",
        label: "Cuenta",
        input: "text",
        required: true,
      },
      {
        key: "holder",
        label: "Titular",
        input: "text",
        required: true,
      },
    ],
  },
}

export function getPaymentMethodDefinition(
  methodType: PaymentMethod,
): PaymentMethodDefinition {
  return PAYMENT_METHOD_DEFINITIONS[methodType]
}

export function getFieldsForType(methodType: PaymentMethod): FieldDef[] {
  return PAYMENT_METHOD_DEFINITIONS[methodType].fields
}

export function listCreatablePaymentMethodTypes(): PaymentMethod[] {
  return (Object.keys(PAYMENT_METHOD_DEFINITIONS) as PaymentMethod[]).filter(
    (code) => !PAYMENT_METHOD_DEFINITIONS[code].legacy,
  )
}

export function getPaymentMethodCurrency(methodType: PaymentMethod): PaymentCurrency {
  return PAYMENT_METHOD_DEFINITIONS[methodType].currency
}

export function isDollarMethodType(methodType: PaymentMethod): boolean {
  return getPaymentMethodCurrency(methodType) === "USD"
}

export function isBolivarMethodType(methodType: PaymentMethod): boolean {
  return getPaymentMethodCurrency(methodType) === "VES"
}
