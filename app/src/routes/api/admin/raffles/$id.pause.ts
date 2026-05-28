import { createFileRoute } from "@tanstack/react-router"
import { transitionRaffle } from "@/server/raffle-lifecycle.service"
import { requireAdmin } from "@/lib/auth-utils.server"

/** @deprecated Prefer POST /lifecycle — kept for compatibility. */
export const Route = createFileRoute("/api/admin/raffles/$id/pause")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        await requireAdmin(request)
        return Response.json(
          await transitionRaffle(Number(params.id), { intent: "pause_sales" }),
        )
      },
    },
  },
})
