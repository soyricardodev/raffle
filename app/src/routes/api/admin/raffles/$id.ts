import { createFileRoute } from "@tanstack/react-router"
import { getRaffleById, updateRaffle, deleteRaffle } from "@/server/raffle.service"
import { requireAdmin, requireSuperAdmin } from "@/lib/auth-utils.server"

export const Route = createFileRoute("/api/admin/raffles/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        await requireAdmin(request)
        return Response.json(
          await getRaffleById(Number(params.id), { includeInactivePaymentMethods: true }),
        )
      },
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
