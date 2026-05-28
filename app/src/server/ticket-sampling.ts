import { randomInt } from "node:crypto"
import { InsufficientTicketsError } from "@raffle/shared/errors"

/** Uniform integer in `[0, maxExclusive)`. */
export type RandomIntFn = (maxExclusive: number) => number

export function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) {
    throw new RangeError("maxExclusive must be positive")
  }
  return randomInt(maxExclusive)
}

/**
 * Partial Fisher–Yates: uniform sample of `quantity` items without replacement.
 */
export function sampleWithoutReplacement<T>(
  items: readonly T[],
  quantity: number,
  randomIntFn: RandomIntFn = secureRandomInt,
): T[] {
  if (quantity < 0 || quantity > items.length) {
    throw new RangeError("quantity out of range")
  }
  if (quantity === 0) return []

  const pool = [...items]
  for (let i = 0; i < quantity; i++) {
    const j = i + randomIntFn(pool.length - i)
    const tmp = pool[i]!
    pool[i] = pool[j]!
    pool[j] = tmp
  }
  return pool.slice(0, quantity)
}

/**
 * Uniformly samples `quantity` free ticket numbers from `[0, totalTickets)`.
 * Scans the full range (not only the lowest free prefix).
 */
export function pickFreeTicketNumbers(
  occupied: Set<number>,
  totalTickets: number,
  quantity: number,
  randomIntFn: RandomIntFn = secureRandomInt,
): number[] {
  const free: number[] = []
  for (let n = 0; n < totalTickets; n++) {
    if (!occupied.has(n)) free.push(n)
  }
  if (free.length < quantity) {
    throw new InsufficientTicketsError(free.length, quantity)
  }
  return sampleWithoutReplacement(free, quantity, randomIntFn)
}
