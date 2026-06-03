import { z } from "zod"
import { getFieldsForType } from "./definitions.js"
import { normalizeAccountInfoKeys } from "./normalize.js"
import { PaymentMethod } from "./types.js"
import {
  getZelleContactValue,
  looksLikeZelleEmail,
} from "./zelle-contact.js"

const digitsOnly = (label: string) =>
  z.string().min(1, `${label} requerido`).regex(/^\d+$/, `${label}: solo números`)

const emailField = z.string().email("Correo inválido")

const pagoMovilSchema = z.object({
  bank: z.string().min(1, "Banco requerido"),
  phone: digitsOnly("Teléfono"),
  cedula_type: z.enum(["V", "J", "E"], { message: "Tipo de documento inválido" }),
  cedula_number: digitsOnly("Número de documento"),
})

const usdEmailSchema = z.object({
  email: emailField,
})

const zellePhoneField = z
  .string()
  .min(1, "Teléfono requerido")
  .regex(/^\d{10,15}$/, "Teléfono inválido (10-15 dígitos)")

function parseZelleAccountInfo(raw: Record<string, string>): Record<string, string> {
  const normalized = normalizeAccountInfoKeys("zelle", raw)
  const contact = getZelleContactValue(normalized)

  if (!contact) {
    throw new z.ZodError([
      {
        code: "custom",
        message: "Correo o teléfono requerido",
        path: ["contact"],
      },
    ])
  }

  const cleaned: Record<string, string> = {}

  if (looksLikeZelleEmail(contact)) {
    cleaned.email = emailField.parse(contact)
  } else {
    cleaned.phone = zellePhoneField.parse(contact.replace(/\D/g, ""))
  }

  if (normalized.holder_name?.trim()) {
    cleaned.holder_name = normalized.holder_name.trim()
  }

  return cleaned
}

const bankTransferSchema = z.object({
  bank: z.string().min(1, "Banco requerido"),
  account: z.string().min(1, "Cuenta requerida"),
  holder: z.string().min(1, "Titular requerido"),
})

const ACCOUNT_INFO_SCHEMAS: Record<PaymentMethod, z.ZodType<Record<string, string>> | null> = {
  binance: usdEmailSchema,
  zinli: usdEmailSchema,
  zelle: null,
  pago_movil: pagoMovilSchema,
  bs: bankTransferSchema,
  usd: bankTransferSchema,
}

export function parseAccountInfo(
  methodType: PaymentMethod,
  raw: Record<string, string>,
): Record<string, string> {
  if (methodType === "zelle") {
    return parseZelleAccountInfo(raw)
  }

  const normalized = normalizeAccountInfoKeys(methodType, raw)
  const schema = ACCOUNT_INFO_SCHEMAS[methodType]
  if (!schema) {
    throw new Error(`No schema for payment method: ${methodType}`)
  }
  const parsed = schema.parse(normalized) as Record<string, string>
  const cleaned: Record<string, string> = {}
  for (const [k, v] of Object.entries(parsed)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      cleaned[k] = String(v).trim()
    }
  }
  return cleaned
}

export function safeParseAccountInfo(
  methodType: PaymentMethod,
  raw: Record<string, string>,
): { success: true; data: Record<string, string> } | { success: false; error: z.ZodError } {
  try {
    return { success: true, data: parseAccountInfo(methodType, raw) }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e }
    throw e
  }
}

export function emptyAccountInfoDraft(methodType: PaymentMethod): Record<string, string> {
  const fields = getFieldsForType(methodType)
  return Object.fromEntries(fields.map((f) => [f.key, ""]))
}

export const CreatePaymentAccountInput = z.object({
  label: z.string().min(1, "Nombre requerido").max(120),
  method_type: PaymentMethod,
  account_info: z.record(z.string(), z.string()),
  is_active: z.boolean().default(true),
})

export type CreatePaymentAccountInput = z.infer<typeof CreatePaymentAccountInput>

export const UpdatePaymentAccountInput = CreatePaymentAccountInput.partial()
export type UpdatePaymentAccountInput = z.infer<typeof UpdatePaymentAccountInput>

export function validatePaymentAccountInput(input: {
  method_type: PaymentMethod
  account_info: Record<string, string>
}): Record<string, string> {
  return parseAccountInfo(input.method_type, input.account_info)
}
