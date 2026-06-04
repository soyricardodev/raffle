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

/** When many tickets are free, random probing avoids scanning the full range. */
export function shouldProbeFreeTickets(
  freeCount: number,
  totalTickets: number,
  quantity: number,
): boolean {
  const probeThreshold = Math.max(quantity * 8, 64)
  return freeCount > probeThreshold && freeCount > totalTickets * 0.25
}

function probeFreeTicketNumbers(
  occupied: Set<number>,
  totalTickets: number,
  quantity: number,
  randomIntFn: RandomIntFn,
): number[] | null {
  const picked = new Set<number>()
  const maxAttempts = quantity * 40
  let attempts = 0

  while (picked.size < quantity && attempts < maxAttempts) {
    attempts++
    const candidate = randomIntFn(totalTickets)
    if (!occupied.has(candidate)) {
      picked.add(candidate)
    }
  }

  return picked.size === quantity ? [...picked] : null
}

/** Builds the list of free ticket numbers (used when few remain or probing fails). */
export function buildFreeTicketList(occupied: Set<number>, totalTickets: number): number[] {
  const free: number[] = []
  for (let n = 0; n < totalTickets; n++) {
    if (!occupied.has(n)) free.push(n)
  }
  return free
}

/**
 * Uniformly samples `quantity` free ticket numbers from `[0, totalTickets)`.
 * Uses random probing when many tickets are free; scans only the free subset near sellout.
 */
export function pickFreeTicketNumbers(
  occupied: Set<number>,
  totalTickets: number,
  quantity: number,
  randomIntFn: RandomIntFn = secureRandomInt,
): number[] {
  const freeCount = totalTickets - occupied.size
  if (freeCount < quantity) {
    throw new InsufficientTicketsError(freeCount, quantity)
  }

  if (shouldProbeFreeTickets(freeCount, totalTickets, quantity)) {
    const probed = probeFreeTicketNumbers(occupied, totalTickets, quantity, randomIntFn)
    if (probed) return probed
  }

  const free = buildFreeTicketList(occupied, totalTickets)
  if (free.length < quantity) {
    throw new InsufficientTicketsError(free.length, quantity)
  }
  return sampleWithoutReplacement(free, quantity, randomIntFn)
}
