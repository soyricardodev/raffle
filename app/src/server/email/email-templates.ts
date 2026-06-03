import { fromCents } from "@raffle/shared/db"
import { isDollarMethod, type EmailType, type PaymentMethod } from "@raffle/shared/validators"

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export type PurchaseEmailContext = {
  purchaseId: number
  customerName: string
  customerEmail: string
  ticketQuantity: number
  totalAmountCents: number
  paymentMethod: string
  raffleName: string
  status?: string
  notes?: string | null
  ticketNumbers?: Array<string>
}

export function buildPurchaseEmailContext(
  purchaseId: number,
  row: {
    customerName: string
    customerEmail: string | null
    ticketQuantity: number
    totalAmountCents: number
    paymentMethod: string
    raffleName: string
    status?: string
    notes?: string | null
  },
  ticketNumbers?: Array<string>,
): PurchaseEmailContext | null {
  const email = row.customerEmail ? String(row.customerEmail).trim() : ""
  if (!email) return null
  return {
    purchaseId,
    customerName: row.customerName,
    customerEmail: email,
    ticketQuantity: row.ticketQuantity,
    totalAmountCents: row.totalAmountCents,
    paymentMethod: row.paymentMethod,
    raffleName: row.raffleName,
    status: row.status,
    notes: row.notes ?? null,
    ticketNumbers,
  }
}

function formatTotal(ctx: PurchaseEmailContext): string {
  const method = ctx.paymentMethod as PaymentMethod
  const currency = isDollarMethod(method) ? "USD" : "Bs"
  return `${currency} ${fromCents(ctx.totalAmountCents)}`
}

export type BuiltEmail = {
  type: EmailType
  subject: string
  html: string
  metadata?: Record<string, unknown>
}

export function buildEmailForType(
  type: EmailType,
  ctx: PurchaseEmailContext,
  options?: { status?: "approved" | "rejected"; modification?: "add" | "remove"; quantity?: number },
): BuiltEmail {
  const ticketsLine =
    ctx.ticketNumbers && ctx.ticketNumbers.length > 0
      ? `<p>Boletos: ${ctx.ticketNumbers.join(", ")}</p>`
      : `<p>Boletos: ${ctx.ticketQuantity}</p>`

  switch (type) {
    case "purchase_confirmation":
      return {
        type,
        subject: `Confirmación de compra — ${ctx.raffleName}`,
        html: `
          <p>Hola ${ctx.customerName},</p>
          <p>Tu compra #${ctx.purchaseId} fue registrada y está <strong>pendiente de verificación</strong>.</p>
          <p>Rifa: <strong>${ctx.raffleName}</strong></p>
          ${ticketsLine}
          <p>Total: ${formatTotal(ctx)}</p>
          <p>Gracias por participar.</p>
        `,
      }
    case "status_update": {
      const status = options?.status ?? (ctx.status === "approved" ? "approved" : "rejected")
      const label = status === "approved" ? "aprobada" : "rechazada"
      const reasonNote =
        status === "rejected" && ctx.notes?.trim()
          ? `<p>Motivo: <strong>${escapeHtml(ctx.notes.trim())}</strong></p>`
          : ""
      return {
        type,
        subject: `Compra ${label} — ${ctx.raffleName}`,
        html: `
          <p>Hola ${ctx.customerName},</p>
          <p>Tu compra #${ctx.purchaseId} fue <strong>${label}</strong>.</p>
          ${reasonNote}
          <p>Rifa: <strong>${ctx.raffleName}</strong></p>
          ${ticketsLine}
        `,
        metadata: { new_status: status },
      }
    }
    case "ticket_modification": {
      const mod = options?.modification ?? "add"
      const qty = options?.quantity ?? 1
      const verb = mod === "add" ? "agregados" : "removidos"
      return {
        type,
        subject: `Boletos ${verb} — ${ctx.raffleName}`,
        html: `
          <p>Hola ${ctx.customerName},</p>
          <p>Se ${verb} <strong>${qty}</strong> boleto(s) en tu compra #${ctx.purchaseId}.</p>
          <p>Rifa: <strong>${ctx.raffleName}</strong></p>
        `,
        metadata: { modification: mod, quantity: qty },
      }
    }
    case "purchase_reassign":
      return {
        type,
        subject: `Boletos reasignados — ${ctx.raffleName}`,
        html: `
          <p>Hola ${ctx.customerName},</p>
          <p>Los boletos de tu compra #${ctx.purchaseId} fueron actualizados.</p>
          <p>Rifa: <strong>${ctx.raffleName}</strong></p>
          ${ticketsLine}
        `,
      }
    case "test":
    default:
      return {
        type: "test",
        subject: `Email de prueba — ${ctx.raffleName}`,
        html: `
          <p>Hola ${ctx.customerName},</p>
          <p>Este es un correo de prueba del sistema de rifas.</p>
          <p>Rifa: <strong>${ctx.raffleName}</strong></p>
        `,
      }
  }
}

/** Sample context when no purchase exists (admin test to arbitrary address). */
export function buildSampleTestEmail(
  type: EmailType,
  to: string,
  options?: { status?: "approved" | "rejected"; modification?: "add" | "remove" },
): BuiltEmail {
  const ctx: PurchaseEmailContext = {
    purchaseId: 0,
    customerName: "Cliente de prueba",
    customerEmail: to,
    ticketQuantity: 3,
    totalAmountCents: 1500,
    paymentMethod: "pago_movil",
    raffleName: "Rifa de prueba",
    status: options?.status === "approved" ? "approved" : "pending",
    ticketNumbers: ["001", "002", "003"],
  }
  if (type === "test") {
    return buildEmailForType("test", ctx)
  }
  return buildEmailForType(type, ctx, options)
}
