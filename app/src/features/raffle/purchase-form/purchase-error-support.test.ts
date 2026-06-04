import { describe, expect, it } from "vitest"
import { ApiClientError } from "@/lib/api-client-error"
import { readApiClientError } from "@/lib/api-error-message"
import {
  buildPurchaseSupportWhatsAppMessage,
  isPurchaseSupportableError,
  resolvePurchaseSupportError,
} from "@/features/raffle/purchase-form/purchase-error-support"

describe("isPurchaseSupportableError", () => {
  it("supports internal errors with traceId", () => {
    const err = new ApiClientError("Error", "INTERNAL_ERROR", 500, "trace-1", true)
    expect(isPurchaseSupportableError(err)).toBe(true)
  })

  it("does not support validation errors", () => {
    const err = new ApiClientError(
      "Referencia duplicada",
      "PAYMENT_REFERENCE_DUPLICATE",
      400,
      undefined,
      false,
    )
    expect(isPurchaseSupportableError(err)).toBe(false)
  })

  it("supports network errors", () => {
    const err = new ApiClientError("Sin conexión", "NETWORK_ERROR", undefined, "net-abc", true)
    expect(isPurchaseSupportableError(err)).toBe(true)
  })

  it("supports 5xx without server traceId after client synthesis", async () => {
    const res = new Response("<html>error</html>", {
      status: 502,
      headers: { "Content-Type": "text/html" },
    })
    const err = await readApiClientError(res)
    expect(err.traceId).toMatch(/^http-/)
    expect(isPurchaseSupportableError(err)).toBe(true)
  })
})

describe("resolvePurchaseSupportError", () => {
  it("returns support state for internal errors with traceId", () => {
    const error = new ApiClientError(
      "Ocurrió un error inesperado",
      "INTERNAL_ERROR",
      500,
      "uuid-123",
      true,
    )
    const support = resolvePurchaseSupportError(error, "No se pudo procesar la compra")
    expect(support).toMatchObject({
      traceId: "uuid-123",
      code: "INTERNAL_ERROR",
      retryable: true,
    })
  })

  it("returns null for validation errors", () => {
    const error = new ApiClientError("Datos inválidos", "VALIDATION_ERROR", 400, undefined, false)
    expect(resolvePurchaseSupportError(error, "fallback")).toBeNull()
  })
})

describe("buildPurchaseSupportWhatsAppMessage", () => {
  it("includes trace code without PII", () => {
    const text = buildPurchaseSupportWhatsAppMessage(
      {
        message: "Error",
        code: "INTERNAL_ERROR",
        traceId: "abc-99",
        retryable: true,
      },
      {
        raffleId: 5,
        raffleName: "Rifa Test",
        ticketQuantity: 3,
        paymentMethodId: 12,
      },
    )
    expect(text).toContain("abc-99")
    expect(text).toContain("Rifa Test")
    expect(text).not.toMatch(/@/)
  })
})
