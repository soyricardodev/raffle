import { randomUUID } from "node:crypto"
import { AppError } from "@raffle/shared/errors"
import { ZodError } from "zod"
import { getLogger } from "@/lib/logger"

const logger = getLogger()

export const GENERIC_INTERNAL_ERROR_MESSAGE =
  "Ocurrió un error inesperado. Intenta de nuevo en unos minutos."

export type ApiErrorPayload = {
  message: string
  code: string
  details?: unknown
  traceId?: string
  retryable?: boolean
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

export function apiErrorPayload(error: unknown): ApiErrorPayload | null {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
      retryable: isRetryableStatus(error.statusCode),
    }
  }

  if (error instanceof ZodError) {
    return {
      message: error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
      details: { fieldErrors: error.flatten().fieldErrors },
      retryable: false,
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

  const traceId = randomUUID()
  logger.error({ err: error, traceId }, "api:unhandled_error")

  return Response.json(
    {
      message: GENERIC_INTERNAL_ERROR_MESSAGE,
      code: "INTERNAL_ERROR",
      traceId,
      retryable: true,
    },
    { status: 500 },
  )
}
