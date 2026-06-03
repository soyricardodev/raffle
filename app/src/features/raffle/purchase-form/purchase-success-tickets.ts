export const TICKET_COLLAPSE_THRESHOLD = 12
export const TICKET_PREVIEW_COUNT = 10
/** Virtualize expanded lists at or above this count. */
export const TICKET_VIRTUALIZE_AT = 60
export const TICKET_GRID_COLUMNS = 6
export const TICKET_ROW_HEIGHT_PX = 28
export const TICKET_ROW_GAP_PX = 4

export type TicketListDisplayMode = "all" | "preview" | "virtual"

export function getTicketListDisplayMode(
  ticketCount: number,
  expanded: boolean,
): TicketListDisplayMode {
  if (ticketCount <= TICKET_COLLAPSE_THRESHOLD) return "all"
  if (!expanded) return "preview"
  if (ticketCount >= TICKET_VIRTUALIZE_AT) return "virtual"
  return "all"
}

export function chunkTicketRows(tickets: string[], columns: number): string[][] {
  if (columns < 1) return [tickets]
  const rows: string[][] = []
  for (let i = 0; i < tickets.length; i += columns) {
    rows.push(tickets.slice(i, i + columns))
  }
  return rows
}

export function getVisibleTicketNumbers(
  ticketNumbers: string[],
  mode: TicketListDisplayMode,
): string[] {
  if (mode === "preview") return ticketNumbers.slice(0, TICKET_PREVIEW_COUNT)
  return ticketNumbers
}

export function getHiddenTicketCount(ticketCount: number, mode: TicketListDisplayMode): number {
  if (mode === "preview") return Math.max(0, ticketCount - TICKET_PREVIEW_COUNT)
  return 0
}

export const TICKET_ROW_STRIDE_PX = TICKET_ROW_HEIGHT_PX + TICKET_ROW_GAP_PX
