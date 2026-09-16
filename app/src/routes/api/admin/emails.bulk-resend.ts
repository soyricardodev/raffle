import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { RESEND_BATCH_MAX } from "@/server/repositories/email-logs.repository"
import {
  previewFailedEmailsForRaffle,
  resendFailedEmailsForRaffle,
} from "@/server/email-admin.service"

const BulkResendInput = z.object({
  raffleId: z.number().int().positive(),
  batchSize: z.number().int().min(1).max(RESEND_BATCH_MAX).optional(),
  /** Preview only — counts without sending anything. */
  dryRun: z.boolean().optional(),
  /** Required to actually send. Prevents an accidental large batch. */
  confirm: z.boolean().optional(),
})

export const Route = createFileRoute("/api/admin/emails/bulk-resend")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request }) => {
        await requireAdmin(request)

        const parsed = BulkResendInput.safeParse(await request.json().catch(() => null))
        if (!parsed.success) {
          return Response.json({ error: "Datos inválidos" }, { status: 400 })
        }

        const { raffleId, batchSize, dryRun, confirm } = parsed.data

        if (dryRun) {
          return Response.json(await previewFailedEmailsForRaffle(raffleId))
        }

        if (!confirm) {
          return Response.json(
            {
              error: "Falta confirm:true para enviar de verdad",
              preview: await previewFailedEmailsForRaffle(raffleId),
            },
            { status: 400 },
          )
        }

        return Response.json(
          await resendFailedEmailsForRaffle({ raffleId, batchSize }),
        )
      },
    }),
  },
})
