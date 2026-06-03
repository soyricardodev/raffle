import { ValidationError } from "@raffle/shared/errors"
import { CreateRaffleInput } from "@raffle/shared/validators"
import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin } from "@/lib/auth-utils.server"
import { createRaffle, getAllRaffles } from "@/server/raffle.service"

export const Route = createFileRoute("/api/admin/raffles/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await requireAdmin(request)
        const url = new URL(request.url)
        const status = url.searchParams.get("status") ?? undefined
        const limit = Number(url.searchParams.get("limit") || 50)
        const page = Number(url.searchParams.get("page") || 1)
        return Response.json(await getAllRaffles({ status, limit, page }))
      },
      POST: async ({ request }) => {
        await requireAdmin(request)
        const parsed = CreateRaffleInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError("Datos de rifa inválidos", parsed.error.flatten().fieldErrors)
        }
        return Response.json(await createRaffle(parsed.data), { status: 201 })
      },
    },
  },
})
