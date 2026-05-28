import { createFileRoute } from "@tanstack/react-router"
import { transitionRaffle } from "@/server/raffle-lifecycle.service"
import { requireAdmin } from "@/lib/auth-utils.server"
import { TransitionRaffleInput } from "@raffle/shared/validators"
import { ValidationError } from "@raffle/shared/errors"

export const Route = createFileRoute("/api/admin/raffles/$id/lifecycle")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        await requireAdmin(request)
        const parsed = TransitionRaffleInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError(
            "Transición de rifa inválida",
            parsed.error.flatten().fieldErrors,
          )
        }
        return Response.json(
          await transitionRaffle(Number(params.id), parsed.data),
        )
      },
    },
  },
})
