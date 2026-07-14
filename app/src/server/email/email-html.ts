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

export function buildRejectionSupportWhatsAppMessage(input: {
  customerName: string
  purchaseId: number
  raffleName: string
}): string {
  const name = input.customerName.trim() || "cliente"
  const raffle = input.raffleName.trim() || "la rifa"
  return `Hola, soy ${name}. Mi compra #${input.purchaseId} de la rifa "${raffle}" fue rechazada y necesito ayuda para resolver el problema de mi pago.`
}
