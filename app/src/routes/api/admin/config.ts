import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin } from "@/lib/auth-utils.server"
import { getSiteConfigMap, updateSiteConfigKey } from "@/server/site-config.service"
import { z } from "zod"

const UpdateConfigInput = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
})

export const Route = createFileRoute("/api/admin/config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await requireAdmin(request)
        return Response.json(await getSiteConfigMap())
      },
      PUT: async ({ request }) => {
        await requireAdmin(request)
        const body = UpdateConfigInput.parse(await request.json())
        const result = await updateSiteConfigKey(body.key, body.value)
        return Response.json(result)
      },
    },
  },
})
