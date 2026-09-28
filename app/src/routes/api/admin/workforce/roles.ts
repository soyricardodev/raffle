import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { apiHandlers } from "@/lib/api-handler"
import { requirePermission } from "@/lib/auth-utils.server"
import { assertSameOriginMutation } from "@/lib/origin-guard.server"
import { createStaffRole } from "@/server/workforce.service"

const body = z.object({ name: z.string(), permissions: z.array(z.string()) })
export const Route = createFileRoute("/api/admin/workforce/roles")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request }) => {
        assertSameOriginMutation(request)
        const actor = await requirePermission(request, "workforce.manage")
        return Response.json(
          await createStaffRole(body.parse(await request.json()), String(actor.id)),
          { status: 201 },
        )
      },
    }),
  },
})
