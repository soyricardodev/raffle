type ErrorBody = {
  message?: unknown
  code?: unknown
  error?: unknown
  cause?: { message?: unknown }
  details?: { fieldErrors?: Record<string, string[]> }
}

function firstFieldError(details: ErrorBody["details"]): string | undefined {
  if (!details?.fieldErrors) return undefined
  for (const messages of Object.values(details.fieldErrors)) {
    const first = messages?.[0]
    if (typeof first === "string" && first) return first
  }
  return undefined
}

function messageFromBody(body: ErrorBody): string | undefined {
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

/** User-facing message from fetch / mutation errors (including TanStack HTTPError wrappers). */
export function getApiErrorMessage(
  error: unknown,
  fallback = "No se pudo completar la operación",
): string {
  if (error instanceof Error) {
    const withCause = error as Error & { cause?: unknown }
    if (withCause.cause instanceof Error && withCause.cause.message) {
      return withCause.cause.message
    }
    if (error.message && error.message !== "HTTPError") {
      return error.message
    }
  }

  if (error && typeof error === "object") {
    const body = error as ErrorBody
    const fromBody = messageFromBody(body)
    if (fromBody) return fromBody
  }

  return fallback
}

export async function readApiErrorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as ErrorBody
  return messageFromBody(body) ?? `Error ${res.status}`
}
