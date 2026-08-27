import { purchaseTickets, purchases, raffles } from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db.server"
import { getLogger } from "@/lib/logger"
import {
  buildEmailForType,
  buildPurchaseEmailContext,
  type PurchaseEmailContext,
} from "./email/email-templates"
import { deliverAndLogEmail } from "./email/email-delivery"

const logger = getLogger()

async function loadPurchaseEmailContext(purchaseId: number): Promise<PurchaseEmailContext | null> {
  const db = getDb()
  const [row] = await db
    .select({
      customerName: purchases.customerName,
      customerEmail: purchases.customerEmail,
      customerPhone: purchases.customerPhone,
      customerCi: purchases.customerCi,
      ticketQuantity: purchases.ticketQuantity,
      totalAmountCents: purchases.totalAmountCents,
      paymentMethod: purchases.paymentMethod,
      paymentReference: purchases.paymentReference,
      paymentPayerName: purchases.paymentPayerName,
      status: purchases.status,
      notes: purchases.notes,
      raffleName: raffles.name,
      raffleImageUrl: raffles.imageUrl,
    })
    .from(purchases)
    .innerJoin(raffles, eq(purchases.raffleId, raffles.id))
    .where(eq(purchases.id, purchaseId))
    .limit(1)

  if (!row) return null

  const ticketRows = await db
    .select({ ticketNumber: purchaseTickets.ticketNumber })
    .from(purchaseTickets)
    .where(eq(purchaseTickets.purchaseId, purchaseId))
    .orderBy(purchaseTickets.ticketNumber)

  return buildPurchaseEmailContext(
    purchaseId,
    row,
    ticketRows.map((t) => String(t.ticketNumber)),
  )
}

export async function sendPurchaseConfirmationEmail(purchaseId: number): Promise<void> {
  const { shouldSendAutomatedEmail } = await import("./email/email-settings.server")
  if (!(await shouldSendAutomatedEmail("purchase_confirmation"))) return

  const ctx = await loadPurchaseEmailContext(purchaseId)
  if (!ctx) return

  try {
    const built = await buildEmailForType("purchase_confirmation", ctx)
    await deliverAndLogEmail({
      to: ctx.customerEmail,
      built,
      purchaseId,
      idempotencyKey: `purchase_confirmation:${purchaseId}`,
    })
  } catch (error) {
    logger.error({ purchaseId, err: error }, "email:purchase_confirmation_failed")
  }
}

export async function sendPurchaseStatusEmail(
  purchaseId: number,
  status: "approved" | "rejected",
): Promise<void> {
  const { shouldSendAutomatedEmail } = await import("./email/email-settings.server")
  if (!(await shouldSendAutomatedEmail("status_update"))) return

  const ctx = await loadPurchaseEmailContext(purchaseId)
  if (!ctx) return

  try {
    const built = await buildEmailForType("status_update", ctx, { status })
    await deliverAndLogEmail({
      to: ctx.customerEmail,
      built,
      purchaseId,
      idempotencyKey: `status_update:${purchaseId}:${status}`,
    })
  } catch (error) {
    logger.error({ purchaseId, status, err: error }, "email:status_update_failed")
  }
}

export async function sendPurchaseEmailByType(
  purchaseId: number,
  type: "purchase_confirmation" | "status_update",
  options?: { status?: "approved" | "rejected" },
): Promise<{ success: boolean; error?: string }> {
  const ctx = await loadPurchaseEmailContext(purchaseId)
  if (!ctx) {
    return { success: false, error: "La compra no tiene correo del cliente" }
  }

  const built =
    type === "status_update"
      ? await buildEmailForType("status_update", ctx, {
          status: options?.status ?? (ctx.status === "approved" ? "approved" : "rejected"),
        })
      : await buildEmailForType("purchase_confirmation", ctx)

  const result = await deliverAndLogEmail({
    to: ctx.customerEmail,
    built,
    purchaseId,
    idempotencyKey: `${type}:${purchaseId}:manual:${Date.now()}`,
  })

  return { success: result.success, error: result.error }
}

export { loadPurchaseEmailContext }
