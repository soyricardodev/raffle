import { ValidationError } from "@raffle/shared/errors"
import { PushInboxLookupInput, PushInboxReadInput } from "@raffle/shared/validators"
import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { rateLimit } from "@/lib/rate-limit"
import { listPushInbox, markPushInboxRead } from "@/server/push.service"

export const Route = createFileRoute("/api/push/inbox")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request }) => {
        await rateLimit(request, { windowMs: 60_000, maxRequests: 60, keyPrefix: "push-inbox" })
        const parsed = PushInboxLookupInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError(
            "Suscripción de avisos inválida",
            parsed.error.flatten().fieldErrors,
          )
        }
        return Response.json(await listPushInbox(parsed.data.endpoint))
      },
      PATCH: async ({ request }) => {
        await rateLimit(request, {
          windowMs: 60_000,
          maxRequests: 40,
          keyPrefix: "push-inbox-read",
        })
        const parsed = PushInboxReadInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError("Aviso inválido", parsed.error.flatten().fieldErrors)
        }
        return Response.json(
          await markPushInboxRead({
            endpoint: parsed.data.endpoint,
            ids: parsed.data.ids,
            all: parsed.data.all,
          }),
        )
      },
    }),
  },
})
