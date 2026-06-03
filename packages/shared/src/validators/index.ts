import { z } from "zod"
import { isBolivarMethodType, isDollarMethodType } from "../payment-methods/definitions.js"
import { CountryScope, isValidCustomerCi } from "./buyer-identity.js"
import { passwordSchema } from "./password.js"

export {
  ChangePasswordFormInput,
  type ChangePasswordPayload,
  validateChangePasswordForm,
} from "./change-password.js"
export { passwordSchema } from "./password.js"
export { zodIssuesToFieldErrors } from "./zod-utils.js"

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

/** Formato enviado a la API: `Venezuela, {estado}` u otro texto libre. */
export function formatCustomerLocation(
  locationType: CustomerLocationType,
  selectedState: string,
  customLocation: string,
): string {
  if (locationType === "venezuela") {
    return selectedState ? `Venezuela, ${selectedState}` : ""
  }
  return customLocation.trim()
}

export function customerLocationFieldError(
  locationType: CustomerLocationType,
  selectedState: string,
  customLocation: string,
): string | undefined {
  if (locationType === "venezuela" && !selectedState) {
    return "Selecciona tu estado"
  }
  if (locationType === "other" && !customLocation.trim()) {
    return "Indica país y ciudad"
  }
  return undefined
}

// ─── Referencias de pago ─────────────────────────────────────

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
  applyVenezuelanMobilePrefix,
  CedulaPrefix,
  CountryScope,
  CustomerCi,
  CustomerEmail,
  CustomerPhone,
  DEFAULT_VENEZUELAN_MOBILE_PREFIX,
  formatCustomerCi,
  formatVenezuelanMobile,
  isValidCustomerCi,
  isValidCustomerPhone,
  isValidInternationalPhone,
  isValidVenezuelanMobile,
  isVenezuelanMobilePrefix,
  normalizeCountryScope,
  normalizeCustomerCi,
  type PhoneInputMode,
  parseCustomerCi,
  parseVenezuelanMobilePrefix,
  phoneDisplayValue,
  sanitizeCiDigits,
  sanitizePhoneInput,
  splitVenezuelanMobile,
  transitionPhoneScope,
  updateVenezuelanMobileSuffix,
  VENEZUELAN_MOBILE_PREFIXES,
  type VenezuelanMobileParts,
  type VenezuelanMobilePrefix,
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
  customer_location: z.string().min(1).max(100),
  raffle_payment_method_id: z.number().int().positive(),
  payment_reference: z
    .string()
    .trim()
    .min(10, "La referencia debe tener al menos 10 caracteres")
    .max(100),
  ticket_quantity: z.number().int().min(1).max(500),
})

export type CreatePurchaseInput = z.infer<typeof CreatePurchaseInput>

/** Cuerpo camelCase (multipart FormData o JSON público). */
export const CreatePurchaseBody = z.object({
  raffleId: z.coerce.number().int().positive(),
  customerName: z.string().trim().min(1, "Ingresa tu nombre").max(200),
  customerPhone: z.string().trim().min(7).max(20),
  customerEmail: z.string().trim().min(1, "Ingresa tu email").email("Email inválido").max(100),
  customerCi: z
    .string()
    .trim()
    .min(1, "Ingresa tu cédula")
    .max(20)
    .refine((v) => isValidCustomerCi(v), "Cédula inválida (ej: V12345678)"),
  customerLocation: z.string().trim().min(1, "Indica tu ubicación").max(100),
  rafflePaymentMethodId: z.coerce.number().int().positive(),
  paymentReference: z
    .string()
    .trim()
    .min(10, "La referencia debe tener al menos 10 caracteres")
    .max(100),
  ticketQuantity: z.coerce.number().int().min(1).max(500),
  paymentProofUrl: z.string().trim().min(1, "Comprobante requerido").max(500),
})

export type CreatePurchaseBody = z.infer<typeof CreatePurchaseBody>

export function parseCreatePurchaseBody(raw: Record<string, unknown>): CreatePurchaseBody {
  return CreatePurchaseBody.parse(raw)
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

export const AddRemoveTicketsInput = z.object({
  quantity: z.number().int().min(1).max(50000),
})
export type AddRemoveTicketsInput = z.infer<typeof AddRemoveTicketsInput>

/** Boletos fijos de la plataforma: enteros 0–9999 (10.000 boletos). */
export const PLATFORM_TOTAL_TICKETS = 10_000

export const CreateRaffleInput = z.object({
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
        is_active: z.boolean().default(true),
      }),
    )
    .optional(),
})

export {
  CreatePaymentAccountInput,
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
export const UpdateRaffleInput = CreateRaffleInput.omit({ status: true }).partial()
export type UpdateRaffleInput = z.infer<typeof UpdateRaffleInput>

export const RaffleLifecycleIntent = z.enum([
  "pause_sales",
  "resume_sales",
  "finish",
  "activate",
  "publish_results",
  "set_status",
])
export type RaffleLifecycleIntent = z.infer<typeof RaffleLifecycleIntent>

export const TransitionRaffleInput = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("pause_sales") }),
  z.object({ intent: z.literal("resume_sales") }),
  z.object({ intent: z.literal("finish") }),
  z.object({ intent: z.literal("activate") }),
  z.object({ intent: z.literal("publish_results") }),
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
