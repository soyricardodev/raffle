import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { getEnv } from "@/lib/env"
import { runNotificationDispatch } from "@/server/email/notification-dispatch"
import { listActiveRaffleIds } from "@/server/repositories/notification-dispatch.repository"

function isAuthorized(request: Request): boolean {
  const env = getEnv()
  const expected = env.CRON_SECRET ?? env.INNGEST_EVENT_KEY
  return Boolean(expected) && request.headers.get("x-cron-secret") === expected
}

/**
 * Drains the pending-notification queue for every active raffle, at most one message
 * per tick. The pacing gate decides whether anything leaves at all, so a scheduled
 * call can never start a bulk run while dispatch is disabled in the environment.
 */
async function drainPendingNotifications(): Promise<Response> {
  const raffleIds = await listActiveRaffleIds()
  const results = []

  for (const raffleId of raffleIds) {
    const summary = await runNotificationDispatch({ raffleId, maxSends: 1, confirm: true })
    results.push({
      raffleId,
      sent: summary.sent,
      blocked: summary.blocked,
      failed: summary.failed,
      stoppedBy: summary.stoppedBy,
      gateReason: summary.gate.reason,
      nextAllowedAt: summary.gate.nextAllowedAt,
    })
  }

  return Response.json({ success: true, results })
}

export const Route = createFileRoute("/api/cron/email-dispatch")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 })
        return drainPendingNotifications()
      },
      POST: async ({ request }) => {
        if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 })
        return drainPendingNotifications()
      },
    }),
  },
})
