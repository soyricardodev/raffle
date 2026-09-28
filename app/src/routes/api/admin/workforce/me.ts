import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-utils.server"
import { navigationPermissionsForUser } from "@/lib/workforce-access.server"
export const Route = createFileRoute("/api/admin/workforce/me")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        const user = await requireAuth(request)
        return Response.json({ permissions: await navigationPermissionsForUser(user) })
      },
    }),
  },
})
