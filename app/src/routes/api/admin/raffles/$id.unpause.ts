import { createFileRoute } from "@tanstack/react-router"
import { unpauseRaffle } from "@/server/pause.service"
import { requireAdmin } from "@/lib/auth-utils.server"

export const Route = createFileRoute("/api/admin/raffles/$id/unpause")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        await requireAdmin(request)
        return Response.json(await unpauseRaffle(Number(params.id)))
      },
    },
  },
})
