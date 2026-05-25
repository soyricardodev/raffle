import { createFileRoute } from "@tanstack/react-router"
import { publishRaffle } from "@/server/raffle.service"
import { requireAdmin } from "@/lib/auth-utils.server"

export const Route = createFileRoute("/api/admin/raffles/$id/publish")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const body = await request.json() as { publish: boolean }
        return Response.json(await publishRaffle(Number(params.id), body.publish))
      },
    },
  },
})
