import { apiErrorResponse } from "@/lib/api-error-response"

type ApiRouteHandler = (...args: any[]) => Promise<Response>

/** Wraps API route handlers so AppError / ZodError become JSON with a readable message. */
export function apiHandlers<T extends Record<string, ApiRouteHandler>>(handlers: T): T {
  const wrapped = {} as T

  for (const [method, handler] of Object.entries(handlers) as [keyof T, ApiRouteHandler][]) {
    wrapped[method] = (async (...args) => {
      try {
        return await handler(...args)
      } catch (error) {
        return apiErrorResponse(error)
      }
    }) as T[keyof T]
  }

  return wrapped
}
