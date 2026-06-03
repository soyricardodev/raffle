import { ValidationError } from "@raffle/shared/errors"
import { describe, expect, it } from "vitest"
import { apiErrorResponse } from "@/lib/api-error-response"

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
})
