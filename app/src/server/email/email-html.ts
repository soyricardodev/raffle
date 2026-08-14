import type { PurchaseEmailContext } from "./email-types"

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Converts relative upload paths to absolute URLs for email clients. */
export function toAbsoluteAssetUrl(path: string | null | undefined, appUrl: string): string | null {
  const trimmed = path?.trim() ?? ""
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const base = appUrl.replace(/\/$/, "")
  const relative = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  return `${base}${relative}`
}

export function verifyTicketsUrl(appUrl: string, customerPhone: string): string {
  const base = appUrl.replace(/\/$/, "")
  return `${base}/verificar?phone=${encodeURIComponent(customerPhone)}`
}

export function whatsAppHrefWithText(digits: string, message: string): string {
  const normalized = digits.replace(/\D/g, "")
  if (!normalized) return ""
  const base = `https://wa.me/${normalized}`
  const text = message.trim()
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}

export function telegramHrefWithText(value: string, message: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  const base = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://t.me/${trimmed.replace(/^@/, "")}`
  const text = message.trim()
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}

export function buildRejectionSupportMessage(
  ctx: Pick<
    PurchaseEmailContext,
    "customerName" | "customerPhone" | "customerCi" | "purchaseId" | "raffleName" | "notes"
  >,
): string {
  const name = ctx.customerName.trim() || "cliente"
  const raffle = ctx.raffleName.trim() || "la rifa"
  const phone = ctx.customerPhone.trim()
  const ci = ctx.customerCi?.trim() ?? ""
  const notes = ctx.notes?.trim() ?? ""

  const lines = [
    "Hola, necesito ayuda con mi compra rechazada.",
    "",
    `Compra: #${ctx.purchaseId}`,
    `Nombre: ${name}`,
  ]

  if (ci) lines.push(`Cédula: ${ci}`)
  if (phone) lines.push(`Teléfono: ${phone}`)

  lines.push(`Rifa: ${raffle}`)

  if (notes) lines.push(`Motivo: ${notes}`)

  lines.push("", "Por favor ayúdame a resolver el problema de mi pago. Gracias.")

  return lines.join("\n")
}

/** @deprecated Use buildRejectionSupportMessage. */
export const buildRejectionSupportWhatsAppMessage = buildRejectionSupportMessage
