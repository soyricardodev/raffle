import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { transitionRaffle } from "@/server/raffle-lifecycle.service"

/** @deprecated Prefer POST /lifecycle — kept for compatibility. */
export const Route = createFileRoute("/api/admin/raffles/$id/unpause")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request, params }) => {
        await requireAdmin(request)
        return Response.json(await transitionRaffle(Number(params.id), { intent: "resume_sales" }))
      },
    }),
  },
})
