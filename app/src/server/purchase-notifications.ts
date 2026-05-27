import { getPool } from "@/lib/db.server"
import { getLogger } from "@/lib/logger"
import { sendEmail } from "./email/email.service"
import { isDollarMethod, type PaymentMethod } from "@raffle/shared/validators"

const logger = getLogger()

export async function sendPurchaseConfirmationEmail(purchaseId: number): Promise<void> {
  const pool = getPool()
  const [rows] = await pool.execute(
    `SELECT p.customer_name, p.customer_email, p.ticket_quantity, p.total_amount,
            p.payment_method, r.name as raffle_name
     FROM purchases p
     JOIN raffles r ON p.raffle_id = r.id
     WHERE p.id = ?`,
    [purchaseId],
  )
  const row = (rows as Record<string, unknown>[])[0]
  if (!row?.customer_email) return

  const email = String(row.customer_email).trim()
  if (!email) return

  const method = row.payment_method as PaymentMethod
  const currency = isDollarMethod(method) ? "USD" : "Bs"

  try {
    const result = await sendEmail({
      to: email,
      type: "purchase_confirmation",
      subject: `Confirmación de compra — ${row.raffle_name}`,
      html: `
        <p>Hola ${row.customer_name},</p>
        <p>Tu compra #${purchaseId} fue registrada y está <strong>pendiente de verificación</strong>.</p>
        <p>Rifa: <strong>${row.raffle_name}</strong></p>
        <p>Boletos: ${row.ticket_quantity} · Total: ${currency} ${row.total_amount}</p>
        <p>Gracias por participar.</p>
      `,
    })

    await pool.execute(
      `INSERT INTO email_logs
       (purchase_id, recipient_email, email_type, subject, status, resend_email_id, sent_at)
       VALUES (?, ?, 'purchase_confirmation', ?, ?, ?, NOW())`,
      [
        purchaseId,
        email,
        `Confirmación de compra — ${row.raffle_name}`,
        result.success ? "sent" : "failed",
        result.providerMessageId ?? null,
      ],
    )
  } catch (error) {
    logger.error({ purchaseId, err: error }, "email:purchase_confirmation_failed")
  }
}

export async function sendPurchaseStatusEmail(
  purchaseId: number,
  status: "approved" | "rejected",
): Promise<void> {
  const pool = getPool()
  const [rows] = await pool.execute(
    `SELECT p.customer_name, p.customer_email, r.name as raffle_name
     FROM purchases p JOIN raffles r ON p.raffle_id = r.id WHERE p.id = ?`,
    [purchaseId],
  )
  const row = (rows as Record<string, unknown>[])[0]
  const email = row?.customer_email ? String(row.customer_email).trim() : ""
  if (!email) return

  const label = status === "approved" ? "aprobada" : "rechazada"
  try {
    const result = await sendEmail({
      to: email,
      type: "status_update",
      subject: `Compra ${label} — ${row.raffle_name}`,
      html: `<p>Hola ${row.customer_name}, tu compra #${purchaseId} fue <strong>${label}</strong>.</p>`,
    })

    await pool.execute(
      `INSERT INTO email_logs
       (purchase_id, recipient_email, email_type, subject, status, resend_email_id, sent_at)
       VALUES (?, ?, 'status_update', ?, ?, ?, NOW())`,
      [
        purchaseId,
        email,
        `Compra ${label}`,
        result.success ? "sent" : "failed",
        result.providerMessageId ?? null,
      ],
    )
  } catch (error) {
    logger.error({ purchaseId, status, err: error }, "email:status_update_failed")
  }
}
