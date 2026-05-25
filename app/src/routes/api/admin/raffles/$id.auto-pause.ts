import { createFileRoute } from "@tanstack/react-router"
import { setAutoPauseEnabled } from "@/server/raffle.service"
import { requireAdmin } from "@/lib/auth-utils.server"
import { z } from "zod"

const AutoPauseInput = z.object({
  enabled: z.boolean(),
})

export const Route = createFileRoute("/api/admin/raffles/$id/auto-pause")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const body = AutoPauseInput.parse(await request.json())
        const result = await setAutoPauseEnabled(Number(params.id), body.enabled)
        return Response.json(result)
      },
    },
  },
})
