import { ValidationError } from "@raffle/shared/errors"
import { apiHandlers } from "@/lib/api-handler"
import { UpdateRaffleInput } from "@raffle/shared/validators"
import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin, requireSuperAdmin } from "@/lib/auth-utils.server"
import { deleteRaffle, getRaffleById, updateRaffle } from "@/server/raffle.service"

export const Route = createFileRoute("/api/admin/raffles/$id")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request, params }) => {
        await requireAdmin(request)
        return Response.json(
          await getRaffleById(Number(params.id), { includeInactivePaymentMethods: true }),
        )
      },
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const parsed = UpdateRaffleInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError("Datos de rifa inválidos", parsed.error.flatten().fieldErrors)
        }
        return Response.json(await updateRaffle(Number(params.id), parsed.data))
      },
      DELETE: async ({ request, params }) => {
        await requireSuperAdmin(request)
        return Response.json(await deleteRaffle(Number(params.id)))
      },
    }),
  },
})
