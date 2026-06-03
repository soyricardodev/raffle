import { fromCents, purchases, raffles } from "@raffle/shared/db"
import { isDollarMethod, type PaymentMethod } from "@raffle/shared/validators"
import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db.server"
import { getLogger } from "@/lib/logger"
import { sendEmail } from "./email/email.service"
import * as emailLogsRepo from "./repositories/email-logs.repository"

const logger = getLogger()

async function loadPurchaseEmailContext(purchaseId: number) {
  const db = getDb()
  const [row] = await db
    .select({
      customerName: purchases.customerName,
      customerEmail: purchases.customerEmail,
      ticketQuantity: purchases.ticketQuantity,
      totalAmountCents: purchases.totalAmountCents,
      paymentMethod: purchases.paymentMethod,
      raffleName: raffles.name,
    })
    .from(purchases)
    .innerJoin(raffles, eq(purchases.raffleId, raffles.id))
    .where(eq(purchases.id, purchaseId))
    .limit(1)
  return row
}

export async function sendPurchaseConfirmationEmail(purchaseId: number): Promise<void> {
  const row = await loadPurchaseEmailContext(purchaseId)
  if (!row?.customerEmail) return

  const email = String(row.customerEmail).trim()
  if (!email) return

  const method = row.paymentMethod as PaymentMethod
  const currency = isDollarMethod(method) ? "USD" : "Bs"
  const total = fromCents(row.totalAmountCents)

  try {
    const result = await sendEmail({
      to: email,
      type: "purchase_confirmation",
      subject: `Confirmación de compra — ${row.raffleName}`,
      html: `
        <p>Hola ${row.customerName},</p>
        <p>Tu compra #${purchaseId} fue registrada y está <strong>pendiente de verificación</strong>.</p>
        <p>Rifa: <strong>${row.raffleName}</strong></p>
        <p>Boletos: ${row.ticketQuantity} · Total: ${currency} ${total}</p>
        <p>Gracias por participar.</p>
      `,
    })

    await emailLogsRepo.insertEmailLog({
      purchaseId,
      recipientEmail: email,
      emailType: "purchase_confirmation",
      subject: `Confirmación de compra — ${row.raffleName}`,
      status: result.success ? "sent" : "failed",
      resendEmailId: result.providerMessageId ?? null,
    })
  } catch (error) {
    logger.error({ purchaseId, err: error }, "email:purchase_confirmation_failed")
  }
}

export async function sendPurchaseStatusEmail(
  purchaseId: number,
  status: "approved" | "rejected",
): Promise<void> {
  const row = await loadPurchaseEmailContext(purchaseId)
  const email = row?.customerEmail ? String(row.customerEmail).trim() : ""
  if (!email || !row) return

  const label = status === "approved" ? "aprobada" : "rechazada"
  try {
    const result = await sendEmail({
      to: email,
      type: "status_update",
      subject: `Compra ${label} — ${row.raffleName}`,
      html: `<p>Hola ${row.customerName}, tu compra #${purchaseId} fue <strong>${label}</strong>.</p>`,
    })

    await emailLogsRepo.insertEmailLog({
      purchaseId,
      recipientEmail: email,
      emailType: "status_update",
      subject: `Compra ${label}`,
      status: result.success ? "sent" : "failed",
      resendEmailId: result.providerMessageId ?? null,
    })
  } catch (error) {
    logger.error({ purchaseId, status, err: error }, "email:status_update_failed")
  }
}
