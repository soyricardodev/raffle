import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { apiHandlers } from "@/lib/api-handler"
import { assertSameOriginMutation } from "@/lib/origin-guard.server"
import { rateLimit } from "@/lib/rate-limit"
import { inspectInvitation } from "@/server/workforce.service"
export const Route = createFileRoute("/api/invitations/inspect")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request }) => {
        assertSameOriginMutation(request)
        await rateLimit(request, {
          windowMs: 60_000,
          maxRequests: 10,
          keyPrefix: "invitation-inspect",
        })
        const { token } = z.object({ token: z.string() }).parse(await request.json())
        return Response.json(await inspectInvitation(token), {
          headers: { "Cache-Control": "no-store" },
        })
      },
    }),
  },
})
