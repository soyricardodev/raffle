/** Normaliza boletos desde API (array) o fila legacy (string CSV). */
export function parseTicketNumbers(
  ticketNumbers?: Array<string>,
  ticketNumbersCsv?: string,
): Array<string> {
  if (ticketNumbers?.length) {
    return ticketNumbers.map((t) => t.trim()).filter(Boolean)
  }
  if (!ticketNumbersCsv?.trim()) return []
  return ticketNumbersCsv
    .split(/[,;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}
