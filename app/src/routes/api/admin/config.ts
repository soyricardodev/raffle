import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin } from "@/lib/auth-utils.server"
import {
  getSiteConfigMap,
  updateSiteConfigKey,
  updateSiteConfigPatch,
} from "@/server/site-config.service"
import { z } from "zod"
import { AdminSiteConfigPatchSchema } from "@raffle/shared/site-config"

const UpdateConfigInput = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
})

const BatchUpdateConfigInput = z.object({
  patch: AdminSiteConfigPatchSchema,
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
      PATCH: async ({ request }) => {
        await requireAdmin(request)
        const body = BatchUpdateConfigInput.parse(await request.json())
        const result = await updateSiteConfigPatch(body.patch)
        return Response.json({ ok: true, patch: result })
      },
    },
  },
})
