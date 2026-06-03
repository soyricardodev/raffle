import { ValidationError } from "@raffle/shared/errors"
import { apiHandlers } from "@/lib/api-handler"
import { PublishRaffleInput } from "@raffle/shared/validators"
import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin } from "@/lib/auth-utils.server"
import { publishRaffle } from "@/server/raffle.service"
import { transitionRaffle } from "@/server/raffle-lifecycle.service"

export const Route = createFileRoute("/api/admin/raffles/$id/publish")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const parsed = PublishRaffleInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError(
            "Datos de publicación inválidos",
            parsed.error.flatten().fieldErrors,
          )
        }
        const id = Number(params.id)
        if (parsed.data.publish) {
          return Response.json(await transitionRaffle(id, { intent: "publish_results" }))
        }
        return Response.json(await publishRaffle(id, false))
      },
    }),
  },
})
