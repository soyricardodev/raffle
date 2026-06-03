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
