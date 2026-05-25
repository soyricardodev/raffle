import { createFileRoute } from "@tanstack/react-router"
import { getAllRaffles, createRaffle } from "@/server/raffle.service"
import { requireAdmin } from "@/lib/auth-utils.server"

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
        const body = await request.json()
        return Response.json(await createRaffle(body), { status: 201 })
      },
    },
  },
})
