import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { apiHandlers } from "@/lib/api-handler"
import { requirePermission } from "@/lib/auth-utils.server"
import { assertSameOriginMutation } from "@/lib/origin-guard.server"
import { updateWorker } from "@/server/workforce.service"

const body = z.object({
  role: z.string(),
  status: z.enum(["active", "disabled", "invited"]),
  grants: z
    .array(z.object({ permission: z.string(), raffleId: z.number().int().positive().nullable() }))
    .max(100),
})
export const Route = createFileRoute("/api/admin/workforce/$id")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request, params }) => {
        assertSameOriginMutation(request)
        const actor = await requirePermission(request, "workforce.manage")
        await updateWorker(params.id, body.parse(await request.json()), String(actor.id))
        return Response.json({ ok: true })
      },
    }),
  },
})
