import { createFileRoute } from "@tanstack/react-router"
import { setRaffleStatus } from "@/server/raffle.service"
import { requireAdmin } from "@/lib/auth-utils.server"
import { SetRaffleStatusInput } from "@raffle/shared/validators"
import { ValidationError } from "@raffle/shared/errors"

export const Route = createFileRoute("/api/admin/raffles/$id/status")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const parsed = SetRaffleStatusInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError(
            "Estado de rifa inválido",
            parsed.error.flatten().fieldErrors,
          )
        }
        return Response.json(
          await setRaffleStatus(Number(params.id), parsed.data.status),
        )
      },
    },
  },
})
