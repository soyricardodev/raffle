import { AppError } from "../errors"

/** Entero 0–9999 ↔ string "0000"–"9999". */
export function ticketNumberToString(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 9999) {
    throw new AppError("Número de boleto inválido", 400, "INVALID_TICKET_NUMBER")
  }
  return String(n).padStart(4, "0")
}

export function ticketNumberToInt(value: string | number): number {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0 || value > 9999) {
      throw new AppError("Número de boleto inválido", 400, "INVALID_TICKET_NUMBER")
    }
    return value
  }

  const trimmed = value.trim()
  if (!/^\d{1,4}$/.test(trimmed)) {
    throw new AppError("Número de boleto inválido (0000-9999)", 400, "INVALID_TICKET_NUMBER")
  }
  return Number.parseInt(trimmed, 10)
}
