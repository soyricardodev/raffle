import {
  PaymentReferenceDuplicateError,
  TooManyRequestsError,
  ValidationError,
} from "@raffle/shared/errors"
import { describe, expect, it } from "vitest"
import { apiHandlers } from "@/lib/api-handler"
import { apiErrorResponse } from "@/lib/api-error-response"
import { readApiErrorMessage } from "@/lib/api-error-message"

describe("apiErrorResponse", () => {
  it("returns JSON with domain message and status", async () => {
    const res = apiErrorResponse(
      new ValidationError("El método de pago seleccionado no está disponible para esta rifa"),
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      message: "El método de pago seleccionado no está disponible para esta rifa",
      code: "VALIDATION_ERROR",
      details: { fieldErrors: undefined },
    })
  })

  it("returns JSON for plain Error instead of rethrowing", async () => {
    const res = apiErrorResponse(new Error("Tipo de archivo no permitido"))

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({
      message: "Tipo de archivo no permitido",
      code: "INTERNAL_ERROR",
    })
  })

  it("returns JSON for purchase domain errors", async () => {
    const res = apiErrorResponse(new PaymentReferenceDuplicateError("1234567890", 1))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      message: 'El número de referencia "1234567890" ya ha sido utilizado para esta rifa',
      code: "PAYMENT_REFERENCE_DUPLICATE",
    })
  })
})

describe("purchase API error toast chain", () => {
  it("maps rate-limit and domain errors to readable JSON messages", async () => {
    const handlers = apiHandlers({
      POST: async (): Promise<Response> => {
        throw new TooManyRequestsError(10)
      },
    })

    const res = await handlers.POST()
    expect(res.status).toBe(429)
    expect(await readApiErrorMessage(res)).toBe(
      "Demasiadas solicitudes. Intenta de nuevo más tarde.",
    )
  })
})
