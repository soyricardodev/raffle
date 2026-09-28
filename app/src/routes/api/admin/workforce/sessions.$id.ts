import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requirePermission } from "@/lib/auth-utils.server"
import { assertSameOriginMutation } from "@/lib/origin-guard.server"
import { revokeStaffSession } from "@/server/workforce.service"
export const Route = createFileRoute("/api/admin/workforce/sessions/$id")({
  server: {
    handlers: apiHandlers({
      DELETE: async ({ request, params }) => {
        assertSameOriginMutation(request)
        const actor = await requirePermission(request, "workforce.manage")
        await revokeStaffSession(params.id, String(actor.id))
        return Response.json({ ok: true })
      },
    }),
  },
})
