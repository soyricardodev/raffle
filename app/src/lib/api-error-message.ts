import {
  ApiClientError,
  NETWORK_ERROR_MESSAGE,
  RESPONSE_PARSE_ERROR_MESSAGE,
  createNetworkClientError,
  isNetworkFailure,
} from "@/lib/api-client-error"

export type ApiErrorBody = {
  message?: unknown
  code?: unknown
  traceId?: unknown
  retryable?: unknown
  error?: unknown
  cause?: { message?: unknown }
  details?: { fieldErrors?: Record<string, string[]> }
}

function firstFieldError(details: ApiErrorBody["details"]): string | undefined {
  if (!details?.fieldErrors) return undefined
  for (const messages of Object.values(details.fieldErrors)) {
    const first = messages?.[0]
    if (typeof first === "string" && first) return first
  }
  return undefined
}

export function messageFromApiErrorBody(body: ApiErrorBody): string | undefined {
  const fieldError = firstFieldError(body.details)
  if (fieldError) return fieldError

  if (typeof body.message === "string" && body.message && body.message !== "HTTPError") {
    return body.message
  }

  if (body.cause && typeof body.cause === "object" && body.cause !== null) {
    const causeMessage = (body.cause as { message?: unknown }).message
    if (typeof causeMessage === "string" && causeMessage) return causeMessage
  }

  if (typeof body.error === "string" && body.error && body.error !== "HTTPError") {
    return body.error
  }

  if (body.error && typeof body.error === "object" && body.error !== null) {
    const nested = (body.error as { message?: unknown }).message
    if (typeof nested === "string" && nested) return nested
  }

  return undefined
}

function defaultMessageForStatus(status: number): string {
  if (status === 401) return "Sesión expirada. Inicia sesión de nuevo."
  if (status === 403) return "No tienes permiso para realizar esta acción."
  if (status === 404) return "No encontramos lo que buscabas."
  if (status === 429) return "Demasiadas solicitudes. Intenta de nuevo más tarde."
  if (status >= 500) return "El servidor tuvo un problema. Intenta de nuevo en unos minutos."
  return `No se pudo completar la operación (${status})`
}

export async function parseApiErrorBody(res: Response): Promise<ApiErrorBody> {
  const contentType = res.headers.get("content-type") ?? ""
  if (contentType && !contentType.includes("json") && !contentType.includes("text")) {
    return {}
  }
  try {
    return (await res.json()) as ApiErrorBody
  } catch {
    return {}
  }
}

export async function readApiClientError(res: Response): Promise<ApiClientError> {
  const body = await parseApiErrorBody(res)
  const message = messageFromApiErrorBody(body) ?? defaultMessageForStatus(res.status)
  const code = typeof body.code === "string" && body.code ? body.code : `HTTP_${res.status}`
  let traceId = typeof body.traceId === "string" ? body.traceId : undefined
  if (!traceId && res.status >= 500) {
    traceId = `http-${Date.now().toString(36)}`
  }
  const retryable =
    body.retryable === true || res.status === 429 || res.status >= 500
  return new ApiClientError(message, code, res.status, traceId, retryable, body.details)
}

/** @deprecated Prefer readApiClientError; kept for simple message-only callers. */
export async function readApiErrorMessage(res: Response): Promise<string> {
  const err = await readApiClientError(res)
  return err.message
}

/** User-facing message from fetch / mutation errors (including TanStack HTTPError wrappers). */
export function getApiErrorMessage(
  error: unknown,
  fallback = "No se pudo completar la operación",
): string {
  if (error instanceof ApiClientError) {
    return error.message
  }

  if (error instanceof Error) {
    if (isNetworkFailure(error)) {
      return NETWORK_ERROR_MESSAGE
    }
    const withCause = error as Error & { cause?: unknown }
    if (withCause.cause instanceof ApiClientError) {
      return withCause.cause.message
    }
    if (withCause.cause instanceof Error && withCause.cause.message) {
      return withCause.cause.message
    }
    if (error.message && error.message !== "HTTPError") {
      return error.message
    }
  }

  if (error && typeof error === "object") {
    const fromBody = messageFromApiErrorBody(error as ApiErrorBody)
    if (fromBody) return fromBody
  }

  return fallback
}

export function normalizeFetchError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error
  if (isNetworkFailure(error)) return createNetworkClientError()
  if (error instanceof Error) {
    return new ApiClientError(error.message, "CLIENT_ERROR", undefined, undefined, false)
  }
  return new ApiClientError(
    "No se pudo completar la operación",
    "UNKNOWN_ERROR",
    undefined,
    undefined,
    false,
  )
}

export function createResponseParseClientError(status?: number): ApiClientError {
  const traceId = `parse-${Date.now().toString(36)}`
  return new ApiClientError(
    RESPONSE_PARSE_ERROR_MESSAGE,
    "RESPONSE_PARSE_ERROR",
    status,
    traceId,
    true,
  )
}
