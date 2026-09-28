import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requirePermission } from "@/lib/auth-utils.server"
import { assertSameOriginMutation } from "@/lib/origin-guard.server"
import { renewInvitation } from "@/server/workforce.service"
export const Route = createFileRoute("/api/admin/workforce/$id/invitation")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request, params }) => {
        assertSameOriginMutation(request)
        const actor = await requirePermission(request, "workforce.manage")
        return Response.json(await renewInvitation(params.id, String(actor.id)))
      },
    }),
  },
})
