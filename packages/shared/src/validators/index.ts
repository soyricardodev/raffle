import { z } from "zod"
import { normalizeMunicipality } from "../geo/venezuela-municipalities.js"
import { isBolivarMethodType, isDollarMethodType } from "../payment-methods/definitions.js"
import { CountryScope, isValidCustomerCi, isValidCustomerPhone } from "./buyer-identity.js"
import { passwordSchema } from "./password.js"

export {
  isValidVenezuelaMunicipality,
  municipalitiesForState,
  municipalityPickerLabel,
  municipalitySearchText,
  normalizeMunicipality,
  singleMunicipalityName,
  type VenezuelaMunicipality,
} from "../geo/venezuela-municipalities.js"

export {
  ChangePasswordFormInput,
  type ChangePasswordPayload,
  validateChangePasswordForm,
} from "./change-password.js"
export { passwordSchema } from "./password.js"
export { zodIssuesToFieldErrors } from "./zod-utils.js"
export { PushSubscribeInput, PushUnsubscribeInput, AdminPushBroadcastInput } from "./push-subscription.js"

// ─── Enums ───────────────────────────────────────────────────

import { PaymentMethod } from "../payment-methods/types.js"

export { PaymentMethod }

export const RaffleStatus = z.enum(["draft", "active", "paused", "finished", "cancelled"])
export type RaffleStatus = z.infer<typeof RaffleStatus>

export const PurchaseStatus = z.enum(["pending", "approved", "rejected"])
export type PurchaseStatus = z.infer<typeof PurchaseStatus>

export const TicketStatus = z.enum(["available", "reserved", "sold"])
export type TicketStatus = z.infer<typeof TicketStatus>

export const UserRole = z.enum(["admin", "super_admin"])
export type UserRole = z.infer<typeof UserRole>

export const PauseReason = z.enum(["manual", "auto_full", "auto_insufficient", "auto_timeout"])
export type PauseReason = z.infer<typeof PauseReason>

export const EmailType = z.enum([
  "purchase_confirmation",
  "status_update",
  "ticket_modification",
  "purchase_reassign",
  "test",
])
export type EmailType = z.infer<typeof EmailType>

export const EmailStatus = z.enum(["pending", "sent", "failed"])
export type EmailStatus = z.infer<typeof EmailStatus>

// ─── Países / Estados ────────────────────────────────────────
// 23 estados + Distrito Capital (República Bolivariana de Venezuela).
// Vargas fue renombrado oficialmente a La Guaira en junio de 2019.
// Ref: https://es.wikipedia.org/wiki/Organización_territorial_de_Venezuela

export const VENEZUELA_STATES = [
  "Amazonas",
  "Anzoátegui",
  "Apure",
  "Aragua",
  "Barinas",
  "Bolívar",
  "Carabobo",
  "Cojedes",
  "Delta Amacuro",
  "Distrito Capital",
  "Falcón",
  "Guárico",
  "Lara",
  "La Guaira",
  "Mérida",
  "Miranda",
  "Monagas",
  "Nueva Esparta",
  "Portuguesa",
  "Sucre",
  "Táchira",
  "Trujillo",
  "Yaracuy",
  "Zulia",
] as const

export const VenezuelaState = z.enum(VENEZUELA_STATES)
export type VenezuelaState = z.infer<typeof VenezuelaState>

export const CustomerLocationType = CountryScope
export type CustomerLocationType = CountryScope

export type CustomerLocationInput = {
  locationType: CustomerLocationType
  selectedState: string
  selectedMunicipality?: string
  customLocation: string
  requireMunicipality?: boolean
}

const LEGACY_STATE_ALIASES: Record<string, string> = {
  caracas: "Distrito Capital",
  vargas: "La Guaira",
  "dtto capital": "Distrito Capital",
  "distrito capital": "Distrito Capital",
  "la guaira": "La Guaira",
  tachira: "Táchira",
  táchira: "Táchira",
  merida: "Mérida",
  mérida: "Mérida",
  anzoategui: "Anzoátegui",
  anzoátegui: "Anzoátegui",
  falcon: "Falcón",
  falcón: "Falcón",
  "nueva esparta": "Nueva Esparta",
  "delta amacuro": "Delta Amacuro",
}

function stripLocationAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "")
}

const STATE_LOOKUP = new Map<string, string>()
for (const state of VENEZUELA_STATES) {
  STATE_LOOKUP.set(state.toLowerCase(), state)
  STATE_LOOKUP.set(stripLocationAccents(state).toLowerCase(), state)
}
for (const [alias, canonical] of Object.entries(LEGACY_STATE_ALIASES)) {
  STATE_LOOKUP.set(alias.toLowerCase(), canonical)
  STATE_LOOKUP.set(stripLocationAccents(alias).toLowerCase(), canonical)
}

export function normalizeVenezuelaState(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const key = trimmed.toLowerCase()
  const accentKey = stripLocationAccents(trimmed).toLowerCase()
  return STATE_LOOKUP.get(key) ?? STATE_LOOKUP.get(accentKey) ?? null
}

export function splitVenezuelaLocation(raw: string): {
  statePart: string
  municipalityPart: string | null
} | null {
  const trimmed = raw.trim()
  if (!trimmed.toLowerCase().startsWith("venezuela,")) return null
  const rest = trimmed.slice("venezuela,".length).trim()
  const commaIdx = rest.indexOf(",")
  if (commaIdx === -1) {
    return { statePart: rest, municipalityPart: null }
  }
  return {
    statePart: rest.slice(0, commaIdx).trim(),
    municipalityPart: rest.slice(commaIdx + 1).trim() || null,
  }
}

/** Formato enviado a la API: `Venezuela, {estado}[, {municipio}]` u otro texto libre. */
export function formatCustomerLocation(input: CustomerLocationInput): string {
  if (input.locationType === "venezuela") {
    const state = input.selectedState.trim()
    const municipality = input.selectedMunicipality?.trim() ?? ""
    if (!state) return ""
    if (!municipality) return `Venezuela, ${state}`
    return `Venezuela, ${state}, ${municipality}`
  }
  return input.customLocation.trim()
}

export function customerLocationFieldError(input: CustomerLocationInput): string | undefined {
  if (input.locationType === "venezuela") {
    if (!input.selectedState.trim()) return "Selecciona tu estado"
    if (input.requireMunicipality && !input.selectedMunicipality?.trim()) {
      return "Selecciona tu municipio"
    }
    return undefined
  }
  if (!input.customLocation.trim()) return "Indica país y ciudad"
  return undefined
}

export function customerLocationApiError(
  value: string,
  requireMunicipality = false,
): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return "Indica tu ubicación"
  if (!requireMunicipality) return undefined

  const split = splitVenezuelaLocation(trimmed)
  if (split) {
    const state = normalizeVenezuelaState(split.statePart)
    if (!state) return "Selecciona tu estado"
    if (!split.municipalityPart || !normalizeMunicipality(state, split.municipalityPart)) {
      return "Selecciona tu municipio"
    }
    return undefined
  }

  if (normalizeVenezuelaState(trimmed)) {
    return "Selecciona tu municipio"
  }
  return undefined
}

const customerLocationString = z
  .string()
  .trim()
  .min(1, "Indica tu ubicación")
  .max(100, "Ubicación demasiado larga")

const adminCustomerLocationString = z
  .string()
  .trim()
  .min(1, "Indica la ubicación")
  .max(100, "Ubicación demasiado larga")

export function assertCustomerLocationMunicipality(
  value: string,
  requireMunicipality: boolean,
  path: string[] = ["customerLocation"],
): void {
  const error = customerLocationApiError(value, requireMunicipality)
  if (!error) return
  throw new z.ZodError([
    {
      code: "custom",
      path,
      message: error,
    },
  ])
}

// ─── Referencias de pago ─────────────────────────────────────

export {
  DEFAULT_PAYMENT_REFERENCE_MIN_LENGTH,
  PAYMENT_REFERENCE_MAX_LENGTH,
  type PaymentReferenceInputMode,
  type PaymentReferencePolicy,
  paymentReferenceValidationMessage,
  resolvePaymentReferenceInputMode,
  resolvePaymentReferenceMinLength,
  resolvePaymentReferencePolicy,
  sanitizePaymentReference,
} from "./payment-reference.js"
export {
  PAYMENT_PAYER_NAME_MAX_LENGTH,
  paymentPayerNameValidationMessage,
} from "./payment-payer-name.js"

/** Métodos que se pagan en USD (price_usd) */
export function isDollarMethod(method: PaymentMethod): boolean {
  return isDollarMethodType(method)
}

/** Métodos que se pagan en Bs (price_bs) */
export function isBolivarMethod(method: PaymentMethod): boolean {
  return isBolivarMethodType(method)
}

// ─── Helpers numéricos ───────────────────────────────────────

/** Ticket number: 0000–9999 */
export const TicketNumber = z.string().regex(/^\d{4}$/, "Número de boleto inválido (0000-9999)")

export {
  CedulaPrefix,
  CountryScope,
  CustomerCi,
  CustomerEmail,
  CustomerPhone,
  formatCustomerCi,
  isValidCustomerCi,
  isValidCustomerPhone,
  normalizeCountryScope,
  normalizeCustomerCi,
  parseCustomerCi,
  phoneDigitCount,
  sanitizeCiDigits,
  sanitizePhoneInput,
} from "./buyer-identity.js"

/** VED currency: CI sin V/E/espacios */
export const Cedula = z
  .string()
  .transform((s) => s.replace(/[\s\-.VEve]/g, ""))
  .pipe(z.string().min(1, "Cédula requerida"))

/** Cantidad de boletos (1–500) */
export function ticketQuantityRange(min: number, max: number) {
  return z
    .number()
    .int()
    .min(min, `Mínimo ${min} boleto(s)`)
    .max(Math.min(max, 500), `Máximo ${Math.min(max, 500)} boletos`)
}

// ─── Schemas de request ──────────────────────────────────────

export const CreatePurchaseInput = z.object({
  raffle_id: z.number().int().positive(),
  customer_name: z.string().min(1).max(200),
  customer_phone: z.string().min(7).max(20),
  customer_email: z.string().trim().min(1, "Ingresa tu email").email("Email inválido").max(100),
  customer_ci: z
    .string()
    .trim()
    .min(1, "Ingresa tu cédula")
    .max(20)
    .refine((v) => isValidCustomerCi(v), "Cédula inválida (ej: V12345678)"),
  customer_location: customerLocationString,
  raffle_payment_method_id: z.number().int().positive(),
  payment_reference: z
    .string()
    .trim()
    .min(1, "Ingresa la referencia de pago")
    .max(100),
  ticket_quantity: z.number().int().min(1).max(500),
})

export type CreatePurchaseInput = z.infer<typeof CreatePurchaseInput>

/** Cuerpo camelCase (multipart FormData o JSON público). */
export const CreatePurchaseBody = z.object({
  raffleId: z.coerce
    .number({ error: "Ingresa un identificador de rifa válido" })
    .int("Ingresa un identificador de rifa válido")
    .positive("Ingresa un identificador de rifa válido"),
  customerName: z.string().trim().min(1, "Ingresa tu nombre").max(200, "Nombre demasiado largo"),
  customerPhone: z
    .string()
    .trim()
    .min(1, "Ingresa tu teléfono")
    .max(20, "Teléfono demasiado largo")
    .refine((v) => isValidCustomerPhone(v), "Teléfono inválido (ej: +58 412… o 0412…)"),
  customerEmail: z.string().trim().min(1, "Ingresa tu email").email("Email inválido").max(100),
  customerCi: z
    .string()
    .trim()
    .min(1, "Ingresa tu cédula")
    .max(20)
    .refine((v) => isValidCustomerCi(v), "Cédula inválida (ej: V12345678)"),
  customerLocation: customerLocationString,
  rafflePaymentMethodId: z.coerce
    .number({ error: "Selecciona un método de pago" })
    .int("Selecciona un método de pago")
    .positive("Selecciona un método de pago"),
  paymentReference: z
    .string()
    .trim()
    .min(1, "Ingresa la referencia de pago")
    .max(100, "Referencia demasiado larga"),
  paymentPayerName: z
    .string()
    .trim()
    .max(200, "Nombre de quien paga demasiado largo")
    .optional(),
  ticketQuantity: z.coerce
    .number({ error: "Indica cuántos boletos quieres comprar" })
    .int("Indica una cantidad válida de boletos")
    .min(1, "Selecciona al menos 1 boleto")
    .max(500, "Máximo 500 boletos por compra"),
  paymentProofUrl: z.string().trim().min(1, "Comprobante requerido").max(500),
})

export type CreatePurchaseBody = z.infer<typeof CreatePurchaseBody>

export function parseCreatePurchaseBody(
  raw: Record<string, unknown>,
  options?: { requireMunicipality?: boolean },
): CreatePurchaseBody {
  const parsed = CreatePurchaseBody.parse(raw)
  assertCustomerLocationMunicipality(parsed.customerLocation, options?.requireMunicipality ?? true)
  return parsed
}

export const VerifyTicketInput = z
  .object({
    phone: z.string().optional(),
    ticketNumber: z.string().optional(),
    cedula: z.string().optional(),
    email: z.string().optional(),
  })
  .refine((d) => d.phone || d.ticketNumber || d.cedula || d.email, {
    message: "Debe proporcionar al menos un criterio de búsqueda",
  })
export type VerifyTicketInput = z.infer<typeof VerifyTicketInput>

/** Public ticket verifier API row. */
export const VerifiedTicketRow = z.object({
  ticket_number: z.string(),
  status: z.string(),
  raffle_id: z.number(),
  purchase_id: z.number().nullable(),
  raffle_name: z.string(),
  draw_date: z.string().nullable(),
  customer_name: z.string().nullable(),
  customer_phone: z.string().nullable(),
  customer_email: z.string().nullable(),
  customer_cedula: z.string().nullable(),
  purchase_status: z.string().nullable(),
})
export type VerifiedTicketRow = z.infer<typeof VerifiedTicketRow>

export const UpdatePurchaseStatusInput = z.object({
  status: z.enum(["approved", "rejected"]),
  notes: z.string().max(500).optional(),
})
export type UpdatePurchaseStatusInput = z.infer<typeof UpdatePurchaseStatusInput>

/** Admin: corregir datos del comprador en una compra individual. */
export const UpdatePurchaseCustomerInput = z.object({
  customerName: z.string().trim().min(1, "Ingresa el nombre").max(200, "Nombre demasiado largo"),
  customerPhone: z
    .string()
    .trim()
    .min(1, "Ingresa el teléfono")
    .max(20, "Teléfono demasiado largo")
    .refine((v) => isValidCustomerPhone(v), "Teléfono inválido"),
  customerEmail: z.string().trim().min(1, "Ingresa el email").email("Email inválido").max(100),
  customerCi: z
    .string()
    .trim()
    .min(1, "Ingresa la cédula")
    .max(20)
    .refine((v) => isValidCustomerCi(v), "Cédula inválida (ej: V12345678)"),
  customerLocation: adminCustomerLocationString,
})
export type UpdatePurchaseCustomerInput = z.infer<typeof UpdatePurchaseCustomerInput>

/** Boletos fijos de la plataforma: enteros 0–9999 (10.000 boletos). */
export const PLATFORM_TOTAL_TICKETS = 10_000

/** Cantidad por operación admin add/remove (tope = inventario máximo de la plataforma). */
export const AddRemoveTicketsInput = z.object({
  quantity: z.coerce
    .number()
    .int("La cantidad debe ser un número entero")
    .min(1, "Debe agregar o quitar al menos 1 boleto")
    .max(
      PLATFORM_TOTAL_TICKETS,
      `Máximo ${PLATFORM_TOTAL_TICKETS.toLocaleString("es-VE")} boletos por operación`,
    ),
})
export type AddRemoveTicketsInput = z.infer<typeof AddRemoveTicketsInput>

const raffleInputFields = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  image_url: z.string().optional().nullable(),
  total_tickets: z.literal(PLATFORM_TOTAL_TICKETS).optional().default(PLATFORM_TOTAL_TICKETS),
  price_bs: z.number().positive(),
  price_usd: z.number().positive(),
  min_purchase: z.number().int().min(1).default(1),
  max_purchase: z.number().int().min(1).default(10),
  draw_date: z.string().datetime().nullable().optional(),
  days_for_draw: z.number().int().positive().nullable().optional(),
  status: RaffleStatus.default("draft"),
  auto_pause_enabled: z.boolean().default(true),
  prizes: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        image_url: z.string().optional(),
        position: z.number().int(),
      }),
    )
    .optional(),
  payment_method_assignments: z
    .array(
      z.object({
        account_id: z.number().int().positive(),
        min_tickets: z.number().int().nullable().optional(),
        min_reference_length: z.number().int().min(1).max(100).nullable().optional(),
        is_active: z.boolean().default(true),
      }),
    )
    .optional(),
})

const RAFFLE_PURCHASE_LIMITS_MESSAGE = "La compra mínima no puede ser mayor que la máxima"

function rafflePurchaseLimitsOk(min?: number, max?: number) {
  if (min == null || max == null) return true
  return min <= max
}

export const CreateRaffleInput = raffleInputFields.refine(
  (data) => rafflePurchaseLimitsOk(data.min_purchase, data.max_purchase),
  { message: RAFFLE_PURCHASE_LIMITS_MESSAGE, path: ["max_purchase"] },
)

export {
  CreatePaymentAccountInput,
  ReorderPaymentAccountsInput,
  UpdatePaymentAccountInput,
} from "../payment-methods/schemas.js"
export {
  CreateRafflePromotionInput,
  discountBpsToPercent,
  discountPercentToBps,
  PromotionKindSchema,
  PromotionScopeSchema,
  UpdateRafflePromotionInput,
} from "./promotions.js"
export type CreateRaffleInput = z.infer<typeof CreateRaffleInput>

/** Edit form must not change status; use admin lifecycle transitions instead. */
export const UpdateRaffleInput = raffleInputFields
  .omit({ status: true, min_purchase: true, max_purchase: true })
  .extend({
    min_purchase: z.number().int().min(1).optional(),
    max_purchase: z.number().int().min(1).optional(),
  })
  .partial()
  .refine((data) => rafflePurchaseLimitsOk(data.min_purchase, data.max_purchase), {
    message: RAFFLE_PURCHASE_LIMITS_MESSAGE,
    path: ["max_purchase"],
  })
export type UpdateRaffleInput = z.infer<typeof UpdateRaffleInput>

export const RaffleLifecycleIntent = z.enum([
  "pause_sales",
  "resume_sales",
  "finish",
  "activate",
  "publish_results",
  "unpublish_results",
  "set_status",
])
export type RaffleLifecycleIntent = z.infer<typeof RaffleLifecycleIntent>

export const TransitionRaffleInput = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("pause_sales") }),
  z.object({ intent: z.literal("resume_sales") }),
  z.object({ intent: z.literal("finish") }),
  z.object({ intent: z.literal("activate") }),
  z.object({ intent: z.literal("publish_results") }),
  z.object({ intent: z.literal("unpublish_results") }),
  z.object({ intent: z.literal("set_status"), status: RaffleStatus }),
])
export type TransitionRaffleInput = z.infer<typeof TransitionRaffleInput>

export const PauseRaffleInput = z.object({
  duration: z.number().int().positive().optional(),
})
export type PauseRaffleInput = z.infer<typeof PauseRaffleInput>

export const PublishRaffleInput = z.object({
  publish: z.boolean(),
})
export type PublishRaffleInput = z.infer<typeof PublishRaffleInput>

export const SetRaffleStatusInput = z.object({
  status: RaffleStatus,
})
export type SetRaffleStatusInput = z.infer<typeof SetRaffleStatusInput>

export const LoginInput = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof LoginInput>

export const CreateUserInput = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().max(100),
  password: passwordSchema,
  role: UserRole.default("admin"),
})
export type CreateUserInput = z.infer<typeof CreateUserInput>

export const PaginationParams = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  page: z.coerce.number().int().min(1).default(1),
})
export type PaginationParams = z.infer<typeof PaginationParams>

export const DateRangeParams = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
})

// ─── Site Config keys ────────────────────────────────────────

export const SITE_CONFIG_KEYS = [
  "site_info",
  "site_colors",
  "site_images",
  "social_media",
  "contact_info",
  "raffle_limits",
  "payment_info",
  "hero_config",
  "email_settings",
  "seo_config",
] as const
