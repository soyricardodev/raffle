import { z } from "zod"
import { PROMOTION_KINDS, PROMOTION_SCOPES } from "../promotions/types.js"

const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime())

export const PromotionKindSchema = z.enum(PROMOTION_KINDS)
export const PromotionScopeSchema = z.enum(PROMOTION_SCOPES)

const promotionBaseFields = {
  name: z.string().trim().min(1, "Nombre requerido").max(120),
  description: z.string().trim().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
  kind: PromotionKindSchema,
  scope: PromotionScopeSchema.default("all_methods"),
  raffle_payment_method_id: z.number().int().positive().nullable().optional(),
  promo_price_bs: z.number().positive().optional().nullable(),
  promo_price_usd: z.number().positive().optional().nullable(),
  discount_percent: z
    .number()
    .positive("El descuento debe ser mayor a 0")
    .max(99.99, "El descuento no puede ser 100% o más")
    .optional()
    .nullable(),
  starts_at: isoDateTime.nullable().optional(),
  ends_at: isoDateTime.nullable().optional(),
}

const promotionBaseSchema = z.object(promotionBaseFields)

type PromotionFieldValues = z.infer<typeof promotionBaseSchema>

function refinePromotionInput(data: Partial<PromotionFieldValues>, ctx: z.RefinementCtx) {
  if (data.scope === "payment_method" && !data.raffle_payment_method_id) {
    ctx.addIssue({
      code: "custom",
      message: "Selecciona un método de pago para esta promoción",
      path: ["raffle_payment_method_id"],
    })
  }
  if (data.scope === "all_methods" && data.raffle_payment_method_id) {
    ctx.addIssue({
      code: "custom",
      message: "No indiques método de pago si la promoción es global",
      path: ["raffle_payment_method_id"],
    })
  }

  if (data.starts_at && data.ends_at) {
    if (new Date(data.starts_at).getTime() >= new Date(data.ends_at).getTime()) {
      ctx.addIssue({
        code: "custom",
        message: "La fecha de fin debe ser posterior al inicio",
        path: ["ends_at"],
      })
    }
  }

  if (data.kind === "fixed_price") {
    const hasBs = data.promo_price_bs != null
    const hasUsd = data.promo_price_usd != null
    if (!hasBs && !hasUsd) {
      ctx.addIssue({
        code: "custom",
        message: "Indica al menos un precio promocional (Bs o USD)",
        path: ["promo_price_bs"],
      })
    }
    if (data.discount_percent != null) {
      ctx.addIssue({
        code: "custom",
        message: "No combines precio fijo con porcentaje",
        path: ["discount_percent"],
      })
    }
  }

  if (data.kind === "percentage") {
    if (data.discount_percent == null) {
      ctx.addIssue({
        code: "custom",
        message: "Indica el porcentaje de descuento",
        path: ["discount_percent"],
      })
    }
    if (data.promo_price_bs != null || data.promo_price_usd != null) {
      ctx.addIssue({
        code: "custom",
        message: "No combines porcentaje con precios fijos",
        path: ["promo_price_bs"],
      })
    }
  }
}

export const CreateRafflePromotionInput = promotionBaseSchema.superRefine(refinePromotionInput)

export type CreateRafflePromotionInput = z.infer<typeof CreateRafflePromotionInput>

export const UpdateRafflePromotionInput = promotionBaseSchema
  .partial()
  .superRefine(refinePromotionInput)
export type UpdateRafflePromotionInput = z.infer<typeof UpdateRafflePromotionInput>

export function discountPercentToBps(percent: number): number {
  return Math.round(percent * 100)
}

export function discountBpsToPercent(bps: number): number {
  return bps / 100
}
