import { z } from "zod"
import { EmailType } from "@raffle/shared/validators"
import type { AdminEmailListInput } from "@raffle/shared/admin/email-list-filters"
import { getEnv } from "@/lib/env"
import { getEmailAdapter } from "./email/email.service"
import { buildSampleTestEmail } from "./email/email-templates"
import {
  deliverAndLogEmail,
  resendIdempotencyKey,
} from "./email/email-delivery"
import { buildResendEmail, parseEmailLogType } from "./email/email-resend"
import { loadPurchaseEmailContext } from "./purchase-notifications"
import * as emailLogsRepo from "./repositories/email-logs.repository"

export type EmailListQuery = emailLogsRepo.EmailLogListParams

export const listEmailLogs = emailLogsRepo.listEmailLogs
export const getEmailLogStats = emailLogsRepo.getEmailLogStats
export const listEmailLogsForPurchase = emailLogsRepo.listEmailLogsForPurchase

export async function getEmailLogDetail(id: number) {
  const row = await emailLogsRepo.getEmailLogById(id)
  if (!row) return null
  const metadata = await emailLogsRepo.getEmailLogMetadata(id)
  return { ...row, metadata }
}

export async function getEmailProviderHealth() {
  const env = getEnv()
  const adapter = getEmailAdapter()
  let fromEmail: string | null = null
  let fromName: string | null = null
  try {
    const { resolveEmailSenderConfig } = await import("./email/email-settings.server")
    const sender = await resolveEmailSenderConfig()
    fromEmail = sender.fromEmail
    fromName = sender.fromName ?? null
  } catch {
    fromEmail = env.EMAIL_FROM?.trim() ?? null
    fromName = env.EMAIL_FROM_NAME?.trim() ?? null
  }
  return {
    provider: env.EMAIL_PROVIDER,
    adapter: adapter.provider,
    is_noop: env.EMAIL_PROVIDER === "noop",
    delivers_real_email: env.EMAIL_PROVIDER !== "noop",
    from_email: fromEmail,
    from_name: fromName,
  }
}

const TestEmailInput = z.object({
  to: z.string().email(),
  type: EmailType.default("test"),
  status: z.enum(["approved", "rejected"]).optional(),
  modification: z.enum(["add", "remove"]).optional(),
})

export async function sendAdminTestEmail(body: unknown) {
  const parsed = TestEmailInput.parse(body)
  const built = buildSampleTestEmail(parsed.type, parsed.to, {
    status: parsed.status,
    modification: parsed.modification,
  })
  return deliverAndLogEmail({
    to: parsed.to.trim(),
    built,
    purchaseId: null,
    idempotencyKey: `test:${parsed.to}:${Date.now()}`,
  })
}

export async function resendEmailFromLog(logId: number) {
  const row = await emailLogsRepo.getEmailLogById(logId)
  if (!row) {
    return { success: false, error: "Registro no encontrado", status: 404 as const }
  }

  const typeResult = parseEmailLogType(String(row.email_type))
  if (!typeResult.ok) {
    return { success: false, error: typeResult.error, status: 400 as const }
  }

  if (!row.purchase_id) {
    return { success: false, error: "Sin compra asociada", status: 400 as const }
  }

  const metadata = await emailLogsRepo.getEmailLogMetadata(logId)
  const ctx = await loadPurchaseEmailContext(row.purchase_id)
  if (!ctx) {
    return { success: false, error: "Compra sin correo del cliente", status: 400 as const }
  }

  const built = buildResendEmail(typeResult.type, ctx, metadata)

  const result = await deliverAndLogEmail({
    to: row.recipient_email,
    built,
    purchaseId: row.purchase_id,
    idempotencyKey: resendIdempotencyKey(logId),
  })

  return {
    success: result.success,
    error: result.error,
    logId: result.logId,
    status: result.success ? (200 as const) : (500 as const),
  }
}

export function emailLogsToCsv(
  rows: emailLogsRepo.EmailLogListRow[],
  stats?: emailLogsRepo.EmailLogStats,
  truncated?: boolean,
  total?: number,
): string {
  const lines: string[] = []
  if (truncated && total != null) {
    lines.push(
      `# Exportación truncada: se incluyen ${rows.length} de ${total} registros que coinciden con los filtros.`,
      "",
    )
  }
  if (stats) {
    lines.push(
      "Métrica,Valor",
      `Total,${stats.total}`,
      `Enviados,${stats.sent}`,
      `Fallidos,${stats.failed}`,
      `Pendientes,${stats.pending}`,
      `Tasa éxito %,${stats.success_rate}`,
      "",
    )
  }
  lines.push(
    "ID,Compra,Destinatario,Tipo,Asunto,Estado,Error,Fecha creación,Fecha envío,Cliente,Teléfono",
    ...rows.map((r) => {
      const esc = (v: string | number | null | undefined) => {
        const s = v == null ? "" : String(v)
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
      }
      return [
        r.id,
        r.purchase_id ?? "",
        r.recipient_email,
        r.email_type,
        r.subject,
        r.status,
        r.error_message ?? "",
        r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
        r.sent_at instanceof Date ? r.sent_at.toISOString() : (r.sent_at ?? ""),
        r.customer_name ?? "",
        r.customer_phone ?? "",
      ]
        .map(esc)
        .join(",")
    }),
  )
  return lines.join("\n")
}

export async function exportEmailLogs(params: AdminEmailListInput) {
  const stats = await getEmailLogStats(params)
  const { data, total, truncated, exported } = await emailLogsRepo.listEmailLogsForExport(params)
  return {
    csv: emailLogsToCsv(data, stats, truncated, total),
    rowCount: exported,
    total,
    truncated,
  }
}
