import { ValidationError } from "@raffle/shared/errors"
import { VerifyTicketInput } from "@raffle/shared/validators"
import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { rateLimit } from "@/lib/rate-limit"
import { verifyPublicTickets } from "@/server/ticket-verify.service"

export const Route = createFileRoute("/api/tickets/verify")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request }) => {
        await rateLimit(request, { windowMs: 30_000, maxRequests: 10, keyPrefix: "verify" })

        let raw: unknown
        try {
          raw = await request.json()
        } catch {
          throw new ValidationError("Debe proporcionar al menos un criterio de búsqueda")
        }

        const tickets = await verifyPublicTickets(VerifyTicketInput.parse(raw))
        return Response.json(tickets)
      },
    }),
  },
})
