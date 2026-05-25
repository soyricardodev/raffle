import { createFileRoute } from "@tanstack/react-router"
import { pauseRaffle } from "@/server/pause.service"
import { requireAdmin } from "@/lib/auth-utils.server"

export const Route = createFileRoute("/api/admin/raffles/$id/pause")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        await requireAdmin(request)
        return Response.json(await pauseRaffle(Number(params.id), "manual"))
      },
    },
  },
})
