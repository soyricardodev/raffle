import { CreatePurchaseBody, parseCreatePurchaseBody } from "@raffle/shared/validators"
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
    ticketQuantity: form.get("ticketQuantity"),
  }
}

export function toCreatePurchaseParams(body: CreatePurchaseBody): CreatePurchaseParams {
  return {
    raffleId: body.raffleId,
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    customerEmail: body.customerEmail || undefined,
    customerCi: body.customerCi || undefined,
    customerLocation: body.customerLocation,
    rafflePaymentMethodId: body.rafflePaymentMethodId,
    paymentReference: body.paymentReference,
    ticketQuantity: body.ticketQuantity,
    paymentProofUrl: body.paymentProofUrl ?? null,
  }
}

export function parsePurchaseFromFormData(form: FormData): CreatePurchaseParams {
  return toCreatePurchaseParams(parseCreatePurchaseBody(formDataToPurchaseRecord(form)))
}

export function parsePurchaseFromJson(raw: unknown): CreatePurchaseParams {
  return toCreatePurchaseParams(parseCreatePurchaseBody(raw as Record<string, unknown>))
}
