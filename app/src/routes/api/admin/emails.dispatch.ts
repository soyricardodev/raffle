import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin, requireAdminMutation } from "@/lib/auth-utils.server"
import {
  DISPATCH_MAX_PER_CALL,
  type DispatchPlan,
  planNotificationDispatch,
  runNotificationDispatch,
} from "@/server/email/notification-dispatch"

/** Preview shape: counts plus a short sample, never the whole queue. */
function toPreview(plan: DispatchPlan) {
  return {
    raffleId: plan.raffleId,
    gate: plan.gate,
    queue: {
      purchases: plan.purchases,
      recipients: plan.recipients,
      duplicateEmailsAvoided: plan.duplicateEmailsAvoided,
      sendable: plan.sendable.length,
      skipped: plan.skipped,
    },
    sample: plan.sendable.slice(0, 10).map((recipient) => ({
      email: recipient.email,
      purchaseCount: recipient.purchaseIds.length,
      ticketCount: recipient.ticketCount,
    })),
  }
}

const DispatchInput = z.object({
  raffleId: z.number().int().positive(),
  /** Preview only — never sends. */
  dryRun: z.boolean().optional(),
  /** Required to actually send. Prevents an accidental batch. */
  confirm: z.boolean().optional(),
  maxSends: z.number().int().min(1).max(DISPATCH_MAX_PER_CALL).optional(),
})

export const Route = createFileRoute("/api/admin/emails/dispatch")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        await requireAdmin(request)
        const raffleId = Number(new URL(request.url).searchParams.get("raffleId"))
        if (!Number.isInteger(raffleId) || raffleId <= 0) {
          return Response.json({ error: "raffleId inválido" }, { status: 400 })
        }

        return Response.json(toPreview(await planNotificationDispatch({ raffleId })))
      },
      POST: async ({ request }) => {
        await requireAdminMutation(request)

        const parsed = DispatchInput.safeParse(await request.json().catch(() => null))
        if (!parsed.success) {
          return Response.json({ error: "Datos inválidos" }, { status: 400 })
        }

        const { raffleId, dryRun, confirm, maxSends } = parsed.data

        if (dryRun || !confirm) {
          const preview = toPreview(await planNotificationDispatch({ raffleId }))
          if (dryRun) return Response.json(preview)

          return Response.json(
            { error: "Falta confirm:true para enviar de verdad", preview },
            { status: 400 },
          )
        }

        return Response.json(await runNotificationDispatch({ raffleId, maxSends, confirm: true }))
      },
    }),
  },
})
