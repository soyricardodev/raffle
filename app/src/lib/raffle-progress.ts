export type RaffleProgressInput = {
  tickets_sold?: number | string | null
  tickets_reserved?: number | string | null
  total_tickets?: number | string | null
}

export type RaffleSalesProgress = {
  percentage: number
  sold: number
  reserved: number
  occupied: number
  total: number
}

export function calculateRaffleSalesProgress(input: RaffleProgressInput): RaffleSalesProgress {
  const sold = Math.max(0, Number(input.tickets_sold) || 0)
  const reserved = Math.max(0, Number(input.tickets_reserved) || 0)
  const total = Math.max(1, Number(input.total_tickets) || 1)
  const occupied = sold + reserved
  const raw = (occupied / total) * 100
  const percentage = Math.min(100, Math.round(raw * 10) / 10)

  return { percentage, sold, reserved, occupied, total }
}
