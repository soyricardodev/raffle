import { ValidationError } from "@raffle/shared/errors"
import { apiHandlers } from "@/lib/api-handler"
import { SetRaffleStatusInput } from "@raffle/shared/validators"
import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin } from "@/lib/auth-utils.server"
import { transitionRaffle } from "@/server/raffle-lifecycle.service"

/** @deprecated Prefer POST /lifecycle — kept for compatibility. */
export const Route = createFileRoute("/api/admin/raffles/$id/status")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const parsed = SetRaffleStatusInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError("Estado de rifa inválido", parsed.error.flatten().fieldErrors)
        }
        return Response.json(
          await transitionRaffle(Number(params.id), {
            intent: "set_status",
            status: parsed.data.status,
          }),
        )
      },
    }),
  },
})
