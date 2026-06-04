import {
  PaymentReferenceDuplicateError,
  TooManyRequestsError,
  ValidationError,
} from "@raffle/shared/errors"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { apiHandlers } from "@/lib/api-handler"
import {
  GENERIC_INTERNAL_ERROR_MESSAGE,
  apiErrorResponse,
} from "@/lib/api-error-response"
import { readApiErrorMessage } from "@/lib/api-error-message"

describe("apiErrorResponse", () => {
  it("returns JSON with domain message and status", async () => {
    const res = apiErrorResponse(
      new ValidationError("El método de pago seleccionado no está disponible para esta rifa"),
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      message: "El método de pago seleccionado no está disponible para esta rifa",
      code: "VALIDATION_ERROR",
      retryable: false,
    })
  })

  it("hides raw message for unknown errors and returns traceId", async () => {
    const res = apiErrorResponse(new Error("Tipo de archivo no permitido"))

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toMatchObject({
      message: GENERIC_INTERNAL_ERROR_MESSAGE,
      code: "INTERNAL_ERROR",
      retryable: true,
    })
    expect(typeof body.traceId).toBe("string")
    expect(body.traceId.length).toBeGreaterThan(0)
  })

  it("returns JSON for purchase domain errors", async () => {
    const res = apiErrorResponse(new PaymentReferenceDuplicateError("1234567890", 1))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      message: 'El número de referencia "1234567890" ya ha sido utilizado para esta rifa',
      code: "PAYMENT_REFERENCE_DUPLICATE",
      retryable: false,
    })
  })

  it("wraps Zod fieldErrors in details.fieldErrors for clients", async () => {
    const schema = z.object({ phone: z.string().min(7, "Teléfono muy corto") })
    let zodError: z.ZodError | undefined
    schema.safeParse({ phone: "1" })
    try {
      schema.parse({ phone: "1" })
    } catch (e) {
      zodError = e as z.ZodError
    }
    expect(zodError).toBeDefined()
    const res = apiErrorResponse(zodError)
    const body = await res.json()
    expect(body.details).toEqual({
      fieldErrors: { phone: ["Teléfono muy corto"] },
    })
  })

  it("marks rate limit errors as retryable", async () => {
    const res = apiErrorResponse(new TooManyRequestsError(10))
    const body = await res.json()
    expect(body.retryable).toBe(true)
    expect(res.status).toBe(429)
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
