/** Convierte monto decimal (Bs/USD) a centavos enteros. */
export function toCents(amount: number | string): number {
  const n = typeof amount === "string" ? Number.parseFloat(amount) : amount
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

/** Convierte centavos a número decimal para display/API legacy. */
export function fromCents(cents: number): number {
  return cents / 100
}
