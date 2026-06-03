import {
  type PurchaseSuccessAnalyticsInput,
  PurchaseSuccessAnalyticsInputSchema,
} from "@raffle/shared/validators/purchase-success-analytics"
import { z } from "zod"
import * as purchaseSuccessAnalyticsRepo from "./repositories/purchase-success-analytics.repository"

export async function recordPurchaseSuccessAnalyticsEvent(raw: unknown) {
  const parsed: PurchaseSuccessAnalyticsInput = PurchaseSuccessAnalyticsInputSchema.parse(raw)
  await purchaseSuccessAnalyticsRepo.insertPurchaseSuccessAnalyticsEvent({
    eventName: parsed.event,
    properties: parsed.properties as Record<string, string | number | boolean>,
    sessionId: parsed.sessionId,
  })
  return { ok: true as const }
}

export function isPurchaseSuccessAnalyticsValidationError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError
}
