export const TICKET_VIRTUALIZE_AT = 60
export const TICKET_GRID_COLUMNS = 6
export const TICKET_ROW_HEIGHT_PX = 28
export const TICKET_ROW_GAP_PX = 4
export const TICKET_ROW_STRIDE_PX = TICKET_ROW_HEIGHT_PX + TICKET_ROW_GAP_PX

export function chunkTicketRows(tickets: string[], columns: number): string[][] {
  if (columns < 1) return [tickets]
  const rows: string[][] = []
  for (let i = 0; i < tickets.length; i += columns) {
    rows.push(tickets.slice(i, i + columns))
  }
  return rows
}

export function shouldVirtualizeTicketBadgeList(ticketCount: number): boolean {
  return ticketCount >= TICKET_VIRTUALIZE_AT
}
