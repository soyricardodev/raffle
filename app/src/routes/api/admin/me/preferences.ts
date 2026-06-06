import { AdminUserPreferencesPatchSchema } from "@raffle/shared/admin/user-preferences"
import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin, requireAdminMutation } from "@/lib/auth-utils.server"
import {
  getUserPreferences,
  updateUserPreferences,
} from "@/server/repositories/user-preferences.repository"

export const Route = createFileRoute("/api/admin/me/preferences")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        const user = await requireAdmin(request)
        const preferences = await getUserPreferences(String(user.id))
        return Response.json(preferences)
      },
      PATCH: async ({ request }) => {
        const user = await requireAdminMutation(request)
        const body = AdminUserPreferencesPatchSchema.parse(await request.json())
        const preferences = await updateUserPreferences(String(user.id), body)
        return Response.json(preferences)
      },
    }),
  },
})
