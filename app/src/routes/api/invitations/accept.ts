import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { apiHandlers } from "@/lib/api-handler"
import { assertSameOriginMutation } from "@/lib/origin-guard.server"
import { rateLimit } from "@/lib/rate-limit"
import { acceptInvitation } from "@/server/workforce.service"
export const Route = createFileRoute("/api/invitations/accept")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request }) => {
        assertSameOriginMutation(request)
        await rateLimit(request, {
          windowMs: 60_000,
          maxRequests: 5,
          keyPrefix: "invitation-accept",
        })
        const { token, password } = z
          .object({ token: z.string(), password: z.string() })
          .parse(await request.json())
        await acceptInvitation(token, password)
        return Response.json({ ok: true })
      },
    }),
  },
})
