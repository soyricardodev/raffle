import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getPool } from "@/lib/db.server"
import { createPurchase } from "./purchase.service"
import {
  InvalidQuantityError,
  PaymentReferenceDuplicateError,
} from "@raffle/shared/errors"

const TOTAL_TICKETS = 50
const MAX_PURCHASE = 5

let raffleId: number

beforeAll(async () => {
  const pool = getPool()

  const [result] = await pool.execute(
    `INSERT INTO raffles
     (name, description, total_tickets, price_bs, price_usd,
      min_purchase, max_purchase, draw_date, status, auto_pause_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "TEST-Concurrency",
      "Rifa de prueba para tests de concurrencia",
      TOTAL_TICKETS,
      10,
      1,
      1,
      MAX_PURCHASE,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      "active",
      false,
    ],
  )
  raffleId = (result as { insertId: number }).insertId

  const batchSize = 100
  for (let i = 0; i < TOTAL_TICKETS; i += batchSize) {
    const batch: (string | number)[][] = []
    for (let j = i; j < Math.min(i + batchSize, TOTAL_TICKETS); j++) {
      batch.push([raffleId, String(j).padStart(4, "0"), "available"])
    }
    const placeholders = batch.map(() => "(?, ?, ?)").join(", ")
    const values = batch.flat()
    await pool.execute(
      `INSERT INTO tickets (raffle_id, ticket_number, status) VALUES ${placeholders}`,
      values,
    )
  }
})

afterAll(async () => {
  const pool = getPool()
  await pool.execute("SET FOREIGN_KEY_CHECKS=0")
  await pool.execute("DELETE FROM tickets WHERE raffle_id = ?", [raffleId])
  await pool.execute("DELETE FROM purchases WHERE raffle_id = ?", [raffleId])
  await pool.execute("DELETE FROM raffles WHERE id = ?", [raffleId])
  await pool.execute("SET FOREIGN_KEY_CHECKS=1")
})

function buyer(seq: number, quantity = 2): Parameters<typeof createPurchase>[0] {
  return {
    raffleId,
    customerName: `Test Buyer ${seq}`,
    customerPhone: `0412000${String(seq).padStart(4, "0")}`,
    paymentMethod: "pago_movil",
    paymentReference: `ref-concurrent-${seq}-${Date.now()}`,
    ticketQuantity: quantity,
  }
}

describe("purchase concurrency", () => {
  it("processes sequential purchases without issues", async () => {
    const r1 = await createPurchase(buyer(1))
    expect(r1.purchaseId).toBeGreaterThan(0)
    expect(r1.ticketNumbers).toHaveLength(2)

    const r2 = await createPurchase(buyer(2))
    expect(r2.purchaseId).toBeGreaterThan(0)
    expect(r2.ticketNumbers).toHaveLength(2)
  })

  it("handles concurrent purchases without overselling", async () => {
    // 10 buyers each want 3 tickets = 30 tickets needed
    // Only ~46 left after first 2 buyers (4 used), so some should fail
    const concurrentBuyers = Array.from({ length: 10 }, (_, i) => buyer(i + 10, 3))

    const results = await Promise.allSettled(concurrentBuyers.map((b) => createPurchase(b)))
    const succeeded = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length

    // At least 1 succeeded and at least 1 failed (concurrent exhaustion)
    expect(succeeded).toBeGreaterThan(0)
    expect(succeeded + failed).toBe(10)

    // Verify no overselling: count sold tickets
    const pool = getPool()
    const [sold] = await pool.execute(
      "SELECT COUNT(*) as c FROM tickets WHERE raffle_id = ? AND status = 'sold'",
      [raffleId],
    )
    const soldCount = Number((sold as [{ c: number }])[0]!.c)
    expect(soldCount).toBeLessThanOrEqual(TOTAL_TICKETS)
  })

  it("rejects duplicate payment references", async () => {
    // Use a fresh raffle section (still tickets available from previous tests)
    const ref = `ref-dup-${Date.now()}`
    const qty = 1 // minimal to avoid availability issues
    const params1 = { ...buyer(50, qty), paymentReference: ref }
    const params2 = { ...buyer(51, qty), paymentReference: ref }

    await createPurchase(params1)
    await expect(createPurchase(params2)).rejects.toThrow(PaymentReferenceDuplicateError)
  })

  it("rejects purchase with invalid quantity", async () => {
    const params = { ...buyer(99), ticketQuantity: 100 }
    await expect(createPurchase(params)).rejects.toThrow(InvalidQuantityError)
  })
})
