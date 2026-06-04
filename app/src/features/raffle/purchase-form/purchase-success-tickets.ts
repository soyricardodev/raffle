import { TICKET_VIRTUALIZE_AT } from "@/features/tickets/ticket-badge-grid"

export {
  chunkTicketRows,
  TICKET_GRID_COLUMNS,
  TICKET_ROW_GAP_PX,
  TICKET_ROW_HEIGHT_PX,
  TICKET_ROW_STRIDE_PX,
  TICKET_VIRTUALIZE_AT,
} from "@/features/tickets/ticket-badge-grid"

export const TICKET_COLLAPSE_THRESHOLD = 12
export const TICKET_PREVIEW_COUNT = 10

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
