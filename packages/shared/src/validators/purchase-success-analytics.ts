import { z } from "zod"

export const PURCHASE_SUCCESS_ANALYTICS_EVENTS = [
  "purchase_success_open",
  "whatsapp_cta_click",
  "instagram_cta_click",
  "tiktok_cta_click",
  "social_cta_click",
  "tickets_expand",
  "tickets_collapse",
  "copy_tickets",
] as const

export type PurchaseSuccessAnalyticsEvent = (typeof PURCHASE_SUCCESS_ANALYTICS_EVENTS)[number]

const baseProps = {
  purchaseId: z.number().int().positive(),
  ticketCount: z.number().int().nonnegative().optional(),
  promoVisible: z.boolean().optional(),
}

export const PurchaseSuccessAnalyticsInputSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("purchase_success_open"),
    properties: z.object({
      purchaseId: baseProps.purchaseId,
      ticketCount: z.number().int().nonnegative(),
      promoVisible: z.boolean(),
    }),
    sessionId: z.string().trim().max(64).optional(),
  }),
  z.object({
    event: z.literal("whatsapp_cta_click"),
    properties: z.object({
      purchaseId: baseProps.purchaseId,
      ticketCount: z.number().int().nonnegative(),
      source: z.enum(["drawer", "reminder_toast"]).optional(),
    }),
    sessionId: z.string().trim().max(64).optional(),
  }),
  z.object({
    event: z.literal("instagram_cta_click"),
    properties: z.object({ purchaseId: baseProps.purchaseId }),
    sessionId: z.string().trim().max(64).optional(),
  }),
  z.object({
    event: z.literal("tiktok_cta_click"),
    properties: z.object({ purchaseId: baseProps.purchaseId }),
    sessionId: z.string().trim().max(64).optional(),
  }),
  z.object({
    event: z.literal("social_cta_click"),
    properties: z.object({
      purchaseId: baseProps.purchaseId,
      socialId: z.string().trim().min(1).max(40),
    }),
    sessionId: z.string().trim().max(64).optional(),
  }),
  z.object({
    event: z.literal("tickets_expand"),
    properties: z.object({
      purchaseId: baseProps.purchaseId,
      ticketCount: z.number().int().nonnegative(),
    }),
    sessionId: z.string().trim().max(64).optional(),
  }),
  z.object({
    event: z.literal("tickets_collapse"),
    properties: z.object({
      purchaseId: baseProps.purchaseId,
      ticketCount: z.number().int().nonnegative(),
    }),
    sessionId: z.string().trim().max(64).optional(),
  }),
  z.object({
    event: z.literal("copy_tickets"),
    properties: z.object({
      purchaseId: baseProps.purchaseId,
      ticketCount: z.number().int().nonnegative(),
    }),
    sessionId: z.string().trim().max(64).optional(),
  }),
])

export type PurchaseSuccessAnalyticsInput = z.infer<typeof PurchaseSuccessAnalyticsInputSchema>

export type PurchaseSuccessAnalyticsPayload = PurchaseSuccessAnalyticsInput["properties"]
