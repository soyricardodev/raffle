/** Typed client error from API / network failures (Spanish user messages). */

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly traceId?: string,
    public readonly retryable = false,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = "ApiClientError"
  }
}

export const NETWORK_ERROR_MESSAGE =
  "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo."

export const RESPONSE_PARSE_ERROR_MESSAGE =
  "Recibimos una respuesta inesperada del servidor. Intenta de nuevo."

export function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return (
    error.name === "AbortError" ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    (error.name === "TypeError" && msg.includes("fetch"))
  )
}

export function createNetworkClientError(): ApiClientError {
  const traceId = `net-${Date.now().toString(36)}`
  return new ApiClientError(NETWORK_ERROR_MESSAGE, "NETWORK_ERROR", undefined, traceId, true)
}
