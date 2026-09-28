import { apiErrorResponse } from "@/lib/api-error-response"

type ApiRouteHandler = (...args: any[]) => Promise<Response>

/** Wraps API route handlers so AppError / ZodError become JSON with a readable message. */
export function apiHandlers<T extends Record<string, ApiRouteHandler>>(handlers: T): T {
  const wrapped = {} as T

  for (const [method, handler] of Object.entries(handlers) as [keyof T, ApiRouteHandler][]) {
    wrapped[method] = (async (...args) => {
      try {
        const response = await handler(...args)
        const request = args[0]?.request as Request | undefined
        if (response.ok && request && request.method !== "GET" && request.method !== "HEAD") {
          const path = new URL(request.url).pathname
          if (
            path.startsWith("/api/admin/") &&
            !path.startsWith("/api/admin/workforce/") &&
            !/^\/api\/admin\/purchases\/\d+\/(status$|tickets\/|customer$)/.test(path)
          ) {
            try {
              const [{ getSession }, { getDb }, { auditEvents }, { raffleIdForAdminPath }] =
                await Promise.all([
                  import("./auth-utils.server"),
                  import("./db.server"),
                  import("@raffle/shared/db"),
                  import("./workforce-access.server"),
                ])
              const session = await getSession(request)
              if (session?.user?.id)
                await getDb()
                  .insert(auditEvents)
                  .values({
                    actorUserId: String(session.user.id),
                    raffleId: await raffleIdForAdminPath(path),
                    action: "admin.http_mutation",
                    payload: JSON.stringify({ method: request.method, path }),
                  })
            } catch (auditError) {
              const { getLogger } = await import("./logger")
              getLogger().error({ err: auditError }, "audit:admin_mutation_failed")
            }
          }
        }
        return response
      } catch (error) {
        return apiErrorResponse(error)
      }
    }) as T[keyof T]
  }

  return wrapped
}
