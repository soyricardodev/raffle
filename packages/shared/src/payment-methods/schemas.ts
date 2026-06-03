import { z } from "zod"
import { getFieldsForType } from "./definitions.js"
import { normalizeAccountInfoKeys } from "./normalize.js"
import { PaymentMethod } from "./types.js"

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

const zelleSchema = z.object({
  email: emailField,
  holder_name: z.string().optional(),
})

const bankTransferSchema = z.object({
  bank: z.string().min(1, "Banco requerido"),
  account: z.string().min(1, "Cuenta requerida"),
  holder: z.string().min(1, "Titular requerido"),
})

const ACCOUNT_INFO_SCHEMAS: Record<PaymentMethod, z.ZodType<Record<string, string>>> = {
  binance: usdEmailSchema,
  zinli: usdEmailSchema,
  zelle: zelleSchema,
  pago_movil: pagoMovilSchema,
  bs: bankTransferSchema,
  usd: bankTransferSchema,
}

export function parseAccountInfo(
  methodType: PaymentMethod,
  raw: Record<string, string>,
): Record<string, string> {
  const normalized = normalizeAccountInfoKeys(methodType, raw)
  const schema = ACCOUNT_INFO_SCHEMAS[methodType]
  const parsed = schema.parse(normalized) as Record<string, string>
  const cleaned: Record<string, string> = {}
  for (const [k, v] of Object.entries(parsed)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      cleaned[k] = String(v).trim()
    }
  }
  if (methodType === "zelle" && parsed.holder_name) {
    cleaned.holder_name = String(parsed.holder_name).trim()
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
