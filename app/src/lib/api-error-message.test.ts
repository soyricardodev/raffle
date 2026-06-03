import { describe, expect, it } from "vitest"
import { getApiErrorMessage, readApiErrorMessage } from "@/lib/api-error-message"

describe("getApiErrorMessage", () => {
  it("uses nested cause message for HTTPError wrappers", () => {
    const error = new Error("HTTPError", {
      cause: new Error("El método de pago seleccionado no está disponible para esta rifa"),
    })
    error.name = "HTTPError"

    expect(getApiErrorMessage(error)).toBe(
      "El método de pago seleccionado no está disponible para esta rifa",
    )
  })

  it("reads message from API error JSON", async () => {
    const res = new Response(
      JSON.stringify({
        message: "El método de pago seleccionado no está disponible para esta rifa",
        code: "VALIDATION_ERROR",
      }),
      { status: 400 },
    )

    expect(await readApiErrorMessage(res)).toBe(
      "El método de pago seleccionado no está disponible para esta rifa",
    )
  })

  it("reads duplicate payment reference message end-to-end", () => {
    const error = new Error(
      'El número de referencia "1234567890" ya ha sido utilizado para esta rifa',
    )

    expect(getApiErrorMessage(error, "No se pudo procesar la compra")).toBe(
      'El número de referencia "1234567890" ya ha sido utilizado para esta rifa',
    )
  })
})
