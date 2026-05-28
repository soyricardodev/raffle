import { z } from "zod"

// ─── Enums ───────────────────────────────────────────────────

export const PaymentMethod = z.enum(["pago_movil", "zinli", "zelle", "binance", "bs", "usd"])
export type PaymentMethod = z.infer<typeof PaymentMethod>

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
  "Mérida",
  "Miranda",
  "Monagas",
  "Nueva Esparta",
  "Portuguesa",
  "Sucre",
  "Táchira",
  "Trujillo",
  "Vargas",
  "Yaracuy",
  "Zulia",
] as const

export const VenezuelaState = z.enum(VENEZUELA_STATES)
export type VenezuelaState = z.infer<typeof VenezuelaState>

// ─── Referencias de pago ─────────────────────────────────────

export const PaymentMethodUSD = z.enum(["zelle", "zinli", "binance", "usd"])
export const PaymentMethodBS = z.enum(["pago_movil", "bs"])

/** Métodos que se pagan en USD (price_usd) */
export function isDollarMethod(method: PaymentMethod): boolean {
  return PaymentMethodUSD.options.includes(method as never)
}

/** Métodos que se pagan en Bs (price_bs) */
export function isBolivarMethod(method: PaymentMethod): boolean {
  return PaymentMethodBS.options.includes(method as never)
}

// ─── Helpers numéricos ───────────────────────────────────────

/** Ticket number: 0000–9999 */
export const TicketNumber = z.string().regex(/^\d{4}$/, "Número de boleto inválido (0000-9999)")

/** VED currency: CI sin V/E/espacios */
export const Cedula = z
  .string()
  .transform((s) => s.replace(/[\s\-.VEve]/g, ""))
  .pipe(z.string().min(1, "Cédula requerida"))

/** Teléfono VE */
export const Phone = z.string().min(7, "Teléfono muy corto").max(20)

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
  customer_email: z.string().email().max(100).or(z.literal("")),
  customer_ci: z.string().max(20),
  customer_location: z.string().max(100).nullable().optional(),
  payment_method: PaymentMethod,
  payment_reference: z.string().max(100),
  ticket_quantity: z.number().int().min(1).max(500),
})

export type CreatePurchaseInput = z.infer<typeof CreatePurchaseInput>

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
  total_tickets: z
    .literal(PLATFORM_TOTAL_TICKETS)
    .optional()
    .default(PLATFORM_TOTAL_TICKETS),
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
  payment_methods: z
    .array(
      z.object({
        method_type: PaymentMethod,
        account_info: z.record(z.string(), z.string()),
        min_tickets: z.number().int().nullable().optional(),
        is_active: z.boolean().default(true),
      }),
    )
    .optional(),
})
export type CreateRaffleInput = z.infer<typeof CreateRaffleInput>

export const UpdateRaffleInput = CreateRaffleInput.partial()
export type UpdateRaffleInput = z.infer<typeof UpdateRaffleInput>

export const PauseRaffleInput = z.object({
  duration: z.number().int().positive().optional(),
})
export type PauseRaffleInput = z.infer<typeof PauseRaffleInput>

export const PublishRaffleInput = z.object({
  publish: z.boolean(),
})
export type PublishRaffleInput = z.infer<typeof PublishRaffleInput>

export const LoginInput = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof LoginInput>

export const CreateUserInput = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().max(100),
  password: z.string().min(6).max(100),
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
] as const
