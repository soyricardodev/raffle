import { AppError, ValidationError } from "@raffle/shared/errors"
import { parsePurchaseFromFormData, parsePurchaseFromJson } from "@/lib/parse-create-purchase"
import { recordPurchaseMetric } from "@/lib/purchase-metrics.server"
import { rateLimitPurchase } from "@/lib/rate-limit"
import { savePaymentProof } from "@/lib/upload.server"
import type { CreatePurchaseParams } from "@/server/purchase.service"
import { createPurchase } from "@/server/purchase.service"
import { sendPurchaseConfirmationEmail } from "@/server/purchase-notifications"

/** JSON body purchases are only for dev, e2e, or explicit opt-in — not public production abuse. */
export function assertJsonPurchaseAllowed(request: Request): void {
  const allowEnv =
    process.env.ALLOW_JSON_PURCHASE === "true" || process.env.ALLOW_JSON_PURCHASE === "1"
  const nodeEnv = process.env.NODE_ENV ?? "development"

  if (nodeEnv !== "production" || allowEnv) {
    return
  }

  const loadSecret = process.env.LOAD_TEST_SECRET
  const headerSecret = request.headers.get("x-load-test-secret")
  if (loadSecret && headerSecret === loadSecret) {
    return
  }

  throw new ValidationError(
    "Las compras deben enviarse con formulario multipart y comprobante de pago",
  )
}

export async function parseCreatePurchaseRequest(request: Request): Promise<CreatePurchaseParams> {
  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData()
    const proofFile = form.get("paymentProof")
    if (!(proofFile instanceof File) || proofFile.size <= 0) {
      throw new ValidationError("Sube el comprobante de pago")
    }
    const paymentProofUrl = await savePaymentProof(proofFile)
    return parsePurchaseFromFormData(form, paymentProofUrl)
  }

  assertJsonPurchaseAllowed(request)
  const json = (await request.json()) as Record<string, unknown>
  if (!json.paymentProofUrl || String(json.paymentProofUrl).trim() === "") {
    throw new ValidationError("Comprobante de pago requerido")
  }
  return parsePurchaseFromJson(json)
}

export type PublicPurchaseResult = Awaited<ReturnType<typeof createPurchase>>

/** Rate limit, persist purchase, metrics, and confirmation email. */
export async function submitPublicPurchase(
  request: Request,
  params: CreatePurchaseParams,
): Promise<PublicPurchaseResult> {
  await rateLimitPurchase(request, params.raffleId)
  const result = await createPurchase(params)
  recordPurchaseMetric("purchase_success", {
    raffleId: params.raffleId,
    ticketQuantity: params.ticketQuantity,
  })
  void sendPurchaseConfirmationEmail(result.purchaseId)
  return result
}

export function purchaseFailureMetricFields(error: unknown): Record<string, string | number> {
  const fields: Record<string, string | number> = {}
  if (error instanceof AppError) {
    fields.errorCode = error.code
  }
  return fields
}
