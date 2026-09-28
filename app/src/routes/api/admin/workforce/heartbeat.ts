import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { getSession, requireAuth } from "@/lib/auth-utils.server"
import { assertSameOriginMutation } from "@/lib/origin-guard.server"
import { heartbeat } from "@/server/workforce.service"
export const Route = createFileRoute("/api/admin/workforce/heartbeat")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request }) => {
        assertSameOriginMutation(request)
        const user = await requireAuth(request)
        const session = await getSession(request)
        if (session?.session.id) await heartbeat(String(user.id), session.session.id)
        return Response.json({ ok: true })
      },
    }),
  },
})
