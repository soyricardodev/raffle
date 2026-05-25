import { createFileRoute } from "@tanstack/react-router"
import { updateRaffle, deleteRaffle } from "@/server/raffle.service"
import { requireAdmin, requireSuperAdmin } from "@/lib/auth-utils.server"

export const Route = createFileRoute("/api/admin/raffles/$id")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const body = await request.json()
        return Response.json(await updateRaffle(Number(params.id), body))
      },
      DELETE: async ({ request, params }) => {
        await requireSuperAdmin(request)
        return Response.json(await deleteRaffle(Number(params.id)))
      },
    },
  },
})
