import { parseCustomerLocation } from "@raffle/shared/analytics"
import { type CreatePurchaseBody, parseCreatePurchaseBody } from "@raffle/shared/validators"
import type { CreatePurchaseParams } from "@/server/purchase.service"

export function formDataToPurchaseRecord(form: FormData): Record<string, unknown> {
  return {
    raffleId: form.get("raffleId"),
    customerName: form.get("customerName"),
    customerPhone: form.get("customerPhone"),
    customerEmail: form.get("customerEmail"),
    customerCi: form.get("customerCi"),
    customerLocation: form.get("customerLocation"),
    rafflePaymentMethodId: form.get("rafflePaymentMethodId"),
    paymentReference: form.get("paymentReference"),
    paymentPayerName: form.get("paymentPayerName") || undefined,
    ticketQuantity: form.get("ticketQuantity"),
  }
}

export function toCreatePurchaseParams(body: CreatePurchaseBody): CreatePurchaseParams {
  const parsed = parseCustomerLocation(body.customerLocation)
  return {
    raffleId: body.raffleId,
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    customerEmail: body.customerEmail,
    customerCi: body.customerCi,
    customerLocation: body.customerLocation,
    locationType: parsed.kind === "international" ? "other" : "venezuela",
    venezuelaState: parsed.state,
    venezuelaMunicipality: parsed.municipality,
    rafflePaymentMethodId: body.rafflePaymentMethodId,
    paymentReference: body.paymentReference,
    paymentPayerName: body.paymentPayerName,
    ticketQuantity: body.ticketQuantity,
    paymentProofUrl: body.paymentProofUrl,
  }
}

export function parsePurchaseFromFormData(
  form: FormData,
  paymentProofUrl: string,
): CreatePurchaseParams {
  return toCreatePurchaseParams(
    parseCreatePurchaseBody({
      ...formDataToPurchaseRecord(form),
      paymentProofUrl,
    }),
  )
}

export function parsePurchaseFromJson(raw: unknown): CreatePurchaseParams {
  return toCreatePurchaseParams(parseCreatePurchaseBody(raw as Record<string, unknown>))
}
