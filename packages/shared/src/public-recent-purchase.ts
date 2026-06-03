export type PublicRecentPurchaseStatus = "pending" | "approved"

export type PublicRecentPurchase = {
  id: string
  displayName: string
  ticketQuantity: number
  status: PublicRecentPurchaseStatus
  createdAt: string
}

export type RecentPurchaseDbRow = {
  publicId: string
  customerName: string
  ticketQuantity: number
  status: string
  createdAt: Date
}

/** Public display name: first name + last initial (no phone/email/CI). */
export function formatPublicBuyerName(fullName: string): string {
  const trimmed = fullName.trim()
  if (!trimmed) return "Alguien"
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!
  const first = parts[0]!
  const lastInitial = parts[parts.length - 1]![0]?.toUpperCase()
  return lastInitial ? `${first} ${lastInitial}.` : first
}

export function toPublicRecentPurchase(row: RecentPurchaseDbRow): PublicRecentPurchase {
  return {
    id: row.publicId,
    displayName: formatPublicBuyerName(row.customerName),
    ticketQuantity: row.ticketQuantity,
    status: row.status as PublicRecentPurchaseStatus,
    createdAt: row.createdAt.toISOString(),
  }
}

/** Full sentence for screen readers and tooltips. */
export function formatRecentPurchaseMessage(
  displayName: string,
  ticketQuantity: number,
  status: PublicRecentPurchaseStatus,
): string {
  const verb = status === "approved" ? "compró" : "reservó"
  const ticketLabel = ticketQuantity === 1 ? "boleto" : "boletos"
  return `${displayName} ${verb} ${ticketQuantity} ${ticketLabel}`
}

/** Short label for the live activity marquee. */
export function formatRecentPurchaseMessageCompact(
  displayName: string,
  ticketQuantity: number,
  status: PublicRecentPurchaseStatus,
): string {
  const action = status === "approved" ? "compró" : "reservó"
  const qty = ticketQuantity === 1 ? "1" : String(ticketQuantity)
  return `${displayName} ${action} ${qty}`
}
