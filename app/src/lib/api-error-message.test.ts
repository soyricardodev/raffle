import { describe, expect, it } from "vitest"
import { ApiClientError } from "@/lib/api-client-error"
import {
  getApiErrorMessage,
  normalizeFetchError,
  readApiClientError,
  readApiErrorMessage,
} from "@/lib/api-error-message"

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
      { status: 400, headers: { "Content-Type": "application/json" } },
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

  it("maps failed to fetch to Spanish network message", () => {
    const error = new TypeError("Failed to fetch")
    expect(getApiErrorMessage(error)).toContain("conectar")
    const normalized = normalizeFetchError(error)
    expect(normalized.code).toBe("NETWORK_ERROR")
    expect(normalized.traceId).toBeTruthy()
  })

  it("returns ApiClientError message directly", () => {
    const err = new ApiClientError("Error de prueba", "INTERNAL_ERROR", 500, "abc-123", true)
    expect(getApiErrorMessage(err)).toBe("Error de prueba")
  })
})

describe("readApiClientError", () => {
  it("parses traceId and retryable from JSON body", async () => {
    const res = new Response(
      JSON.stringify({
        message: GENERIC_INTERNAL_ERROR_MESSAGE,
        code: "INTERNAL_ERROR",
        traceId: "trace-xyz",
        retryable: true,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )

    const err = await readApiClientError(res)
    expect(err.traceId).toBe("trace-xyz")
    expect(err.retryable).toBe(true)
    expect(err.code).toBe("INTERNAL_ERROR")
  })

  it("tolerates non-JSON error bodies and synthesizes traceId for 5xx", async () => {
    const res = new Response("<html>error</html>", {
      status: 502,
      headers: { "Content-Type": "text/html" },
    })
    const err = await readApiClientError(res)
    expect(err.message).toContain("servidor")
    expect(err.status).toBe(502)
    expect(err.retryable).toBe(true)
    expect(err.traceId).toMatch(/^http-/)
  })

  it("reads first Zod field error from normalized API details", async () => {
    const res = new Response(
      JSON.stringify({
        message: "Datos inválidos",
        code: "VALIDATION_ERROR",
        details: { fieldErrors: { customerPhone: ["El teléfono debe tener al menos 7 dígitos"] } },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
    expect(await readApiErrorMessage(res)).toBe("El teléfono debe tener al menos 7 dígitos")
  })
})

const GENERIC_INTERNAL_ERROR_MESSAGE =
  "Ocurrió un error inesperado. Intenta de nuevo en unos minutos."
