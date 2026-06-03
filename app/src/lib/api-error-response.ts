import { AppError } from "@raffle/shared/errors"
import { ZodError } from "zod"

export type ApiErrorPayload = {
  message: string
  code: string
  details?: unknown
}

export function apiErrorPayload(error: unknown): ApiErrorPayload | null {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
    }
  }

  if (error instanceof ZodError) {
    return {
      message: error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
      details: error.flatten().fieldErrors,
    }
  }

  return null
}

/** Maps domain / validation errors to JSON responses for API route handlers. */
export function apiErrorResponse(error: unknown): Response {
  const payload = apiErrorPayload(error)
  if (payload) {
    const status =
      error instanceof AppError ? error.statusCode : error instanceof ZodError ? 400 : 400
    return Response.json(payload, { status })
  }

  if (error instanceof Error && error.message) {
    return Response.json(
      { message: error.message, code: "INTERNAL_ERROR" },
      { status: 500 },
    )
  }

  return Response.json(
    { message: "Error interno del servidor", code: "INTERNAL_ERROR" },
    { status: 500 },
  )
}
