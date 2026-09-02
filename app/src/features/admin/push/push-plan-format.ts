export function formatPushRecipients(count: number | null | undefined): string | null {
  if (count == null) return null
  if (count === 1) return "1 teléfono"
  return `${count.toLocaleString("es-VE")} teléfonos`
}

export function formatTicketsRemaining(count: number): string {
  if (count <= 0) return "Ya se cruzó"
  if (count === 1) return "Falta 1 boleto"
  return `Faltan ${count.toLocaleString("es-VE")} boletos`
}

export function formatSoldPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%"
  const rounded = Math.round(value * 10) / 10
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${label}%`
}

export function formatPlanItemDetail(item: {
  kind: "milestone" | "promotion"
  status: "sent" | "skipped" | "upcoming"
  triggerPercent: number | null
  ticketsRemaining: number | null
  recipientCount: number | null
}): string {
  if (item.status === "sent") {
    return formatPushRecipients(item.recipientCount) ?? "Enviada"
  }
  if (item.status === "skipped") return "Omitida"
  if (item.kind === "promotion") return "Al activarla"
  if (item.triggerPercent == null) return "Al publicar"
  if (item.ticketsRemaining != null && item.ticketsRemaining > 0) {
    return formatTicketsRemaining(item.ticketsRemaining)
  }
  return `Al ${item.triggerPercent}%`
}
