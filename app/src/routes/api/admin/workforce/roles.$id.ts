import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { apiHandlers } from "@/lib/api-handler"
import { requirePermission } from "@/lib/auth-utils.server"
import { assertSameOriginMutation } from "@/lib/origin-guard.server"
import { updateStaffRole } from "@/server/workforce.service"

const body = z.object({ name: z.string(), permissions: z.array(z.string()) })
export const Route = createFileRoute("/api/admin/workforce/roles/$id")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request, params }) => {
        assertSameOriginMutation(request)
        const actor = await requirePermission(request, "workforce.manage")
        await updateStaffRole(params.id, body.parse(await request.json()), String(actor.id))
        return Response.json({ ok: true })
      },
    }),
  },
})
