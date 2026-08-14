import {
  ApiClientError,
  createNetworkClientError,
  isNetworkFailure,
} from "@/lib/api-client-error"
import { getApiErrorMessage, normalizeFetchError } from "@/lib/api-error-message"
import type { ResolvedSupportChannel } from "@/features/layout/social-links"

export type PurchaseSupportErrorState = {
  message: string
  code: string
  traceId: string
  retryable: boolean
}

export type PurchaseSupportContext = {
  raffleId: number | string
  raffleName: string
  ticketQuantity: number
  paymentMethodId: number | null
  pageUrl?: string
}

/** Server / network failures that warrant support-channel handoff (not validation). */
export function isPurchaseSupportableError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    if (error.code === "NETWORK_ERROR" || error.code === "RESPONSE_PARSE_ERROR") {
      return true
    }
    if (error.traceId && error.code === "INTERNAL_ERROR") {
      return true
    }
    if (error.traceId && error.status != null && error.status >= 500) {
      return true
    }
    return false
  }
  return error instanceof Error && isNetworkFailure(error)
}

function toApiClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error
  if (isNetworkFailure(error)) return createNetworkClientError()
  return normalizeFetchError(error)
}

export function resolvePurchaseSupportError(
  error: unknown,
  fallbackMessage: string,
): PurchaseSupportErrorState | null {
  if (!isPurchaseSupportableError(error)) return null

  const client = toApiClientError(error)
  const traceId =
    client.traceId ??
    (isNetworkFailure(error) ? `net-${Date.now().toString(36)}` : `err-${Date.now().toString(36)}`)

  return {
    message: getApiErrorMessage(error, fallbackMessage),
    code: client.code,
    traceId,
    retryable: client.retryable,
  }
}

export function buildPurchaseSupportMessage(
  support: PurchaseSupportErrorState,
  context: PurchaseSupportContext,
): string {
  const raffle = context.raffleName.trim() || `rifa #${context.raffleId}`
  const lines = [
    "Hola, tuve un problema al intentar comprar boletos.",
    `Rifa: ${raffle}`,
    `Código de soporte: ${support.traceId}`,
    `Error: ${support.code}`,
    `Cantidad de boletos: ${context.ticketQuantity}`,
  ]
  if (context.paymentMethodId != null) {
    lines.push(`Método de pago (ID): ${context.paymentMethodId}`)
  }
  if (context.pageUrl) {
    lines.push(`Página: ${context.pageUrl}`)
  }
  lines.push("Por favor ayúdame a revisar qué pasó. Gracias.")
  return lines.join("\n")
}

export function buildPurchaseSupportHref(
  channel: ResolvedSupportChannel,
  support: PurchaseSupportErrorState,
  context: PurchaseSupportContext,
): string {
  return channel.supportHrefWithText(buildPurchaseSupportMessage(support, context))
}

/** @deprecated Use buildPurchaseSupportMessage. */
export const buildPurchaseSupportWhatsAppMessage = buildPurchaseSupportMessage
