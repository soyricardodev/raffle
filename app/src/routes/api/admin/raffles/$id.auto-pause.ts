import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth-utils.server"
import { setAutoPauseEnabled } from "@/server/raffle.service"

const AutoPauseInput = z.object({
  enabled: z.boolean(),
})

export const Route = createFileRoute("/api/admin/raffles/$id/auto-pause")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const body = AutoPauseInput.parse(await request.json())
        const result = await setAutoPauseEnabled(Number(params.id), body.enabled)
        return Response.json(result)
      },
    }),
  },
})
