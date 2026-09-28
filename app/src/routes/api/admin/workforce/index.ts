import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { apiHandlers } from "@/lib/api-handler"
import { requirePermission } from "@/lib/auth-utils.server"
import { assertSameOriginMutation } from "@/lib/origin-guard.server"
import { inviteWorker, listWorkforce } from "@/server/workforce.service"

const grant = z.object({ permission: z.string(), raffleId: z.number().int().positive().nullable() })
const invite = z.object({
  name: z.string(),
  email: z.email(),
  role: z.string(),
  grants: z.array(grant).max(100),
})
export const Route = createFileRoute("/api/admin/workforce/")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        await requirePermission(request, "workforce.read")
        return Response.json(await listWorkforce())
      },
      POST: async ({ request }) => {
        assertSameOriginMutation(request)
        const actor = await requirePermission(request, "workforce.manage")
        const result = await inviteWorker(invite.parse(await request.json()), String(actor.id))
        return Response.json(result, { status: 201 })
      },
    }),
  },
})
