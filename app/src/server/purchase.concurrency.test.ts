import { purchases, purchaseTickets, raffles } from "@raffle/shared/db"
import { InvalidQuantityError, PaymentReferenceDuplicateError } from "@raffle/shared/errors"
import { eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import { seedPagoMovilPaymentMethodForRaffle } from "@/test/payment-methods-test-helper"
import { withTestBuyerDefaults } from "@/test/purchase-test-helper"
import { createPurchase } from "./purchase.service"

const TOTAL_TICKETS = 50
const MAX_PURCHASE = 5
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)("purchase concurrency", () => {
  let raffleId: number
  let rafflePaymentMethodId: number

  beforeAll(async () => {
    await setupIsolatedTestDatabase()
    const db = getDb()
    const [row] = await db
      .insert(raffles)
      .values({
        name: "TEST-Concurrency",
        description: "Rifa de prueba para tests de concurrencia",
        totalTickets: TOTAL_TICKETS,
        priceBsCents: 1000,
        priceUsdCents: 100,
        minPurchase: 1,
        maxPurchase: MAX_PURCHASE,
        drawDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "active",
        autoPauseEnabled: false,
        ticketsAvailable: TOTAL_TICKETS,
        ticketsReserved: 0,
        ticketsSold: 0,
      })
      .returning({ id: raffles.id })

    raffleId = row!.id
    rafflePaymentMethodId = await seedPagoMovilPaymentMethodForRaffle(raffleId)
  })

  afterAll(async () => {
    if (!raffleId) return
    const db = getDb()
    await db.delete(purchaseTickets).where(eq(purchaseTickets.raffleId, raffleId))
    await db.delete(purchases).where(eq(purchases.raffleId, raffleId))
    await db.delete(raffles).where(eq(raffles.id, raffleId))
  })

  function buyer(seq: number, quantity = 2) {
    return withTestBuyerDefaults({
      raffleId,
      customerName: `Test Buyer ${seq}`,
      customerPhone: `0412000${String(seq).padStart(4, "0")}`,
      customerCi: `V${String(10000000 + seq).slice(-8)}`,
      customerEmail: `buyer${seq}@test.local`,
      rafflePaymentMethodId,
      paymentReference: `ref-concurrent-${seq}-${Date.now()}`,
      ticketQuantity: quantity,
    })
  }

  it("processes sequential purchases without issues", async () => {
    const r1 = await createPurchase(buyer(1))
    expect(r1.purchaseId).toBeGreaterThan(0)
    expect(r1.ticketNumbers).toHaveLength(2)

    const r2 = await createPurchase(buyer(2))
    expect(r2.purchaseId).toBeGreaterThan(0)
    expect(r2.ticketNumbers).toHaveLength(2)
  })

  it("handles concurrent purchases without overselling", async () => {
    const concurrentBuyers = Array.from({ length: 10 }, (_, i) => buyer(i + 10, 3))

    const results = await Promise.allSettled(concurrentBuyers.map((b) => createPurchase(b)))
    const succeeded = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length

    expect(succeeded).toBeGreaterThan(0)
    expect(succeeded + failed).toBe(10)

    const db = getDb()
    const ticketRows = await db
      .select({ ticketNumber: purchaseTickets.ticketNumber })
      .from(purchaseTickets)
      .where(eq(purchaseTickets.raffleId, raffleId))

    const uniqueNumbers = new Set(ticketRows.map((r) => r.ticketNumber))
    expect(uniqueNumbers.size).toBe(ticketRows.length)

    const [raffle] = await db.select().from(raffles).where(eq(raffles.id, raffleId)).limit(1)
    expect(raffle).toBeDefined()
    expect(raffle!.ticketsAvailable + raffle!.ticketsReserved + raffle!.ticketsSold).toBe(
      TOTAL_TICKETS,
    )
    expect(raffle!.ticketsAvailable).toBeGreaterThanOrEqual(0)
  })

  it("rejects duplicate payment references", async () => {
    await new Promise((r) => setTimeout(r, 50))
    const ref = `ref-dup-${Date.now()}`
    const params1 = { ...buyer(50, 1), paymentReference: ref }
    const params2 = { ...buyer(51, 1), paymentReference: ref }

    await createPurchase(params1)
    await expect(createPurchase(params2)).rejects.toThrow(PaymentReferenceDuplicateError)
  })

  it("rejects purchase with invalid quantity", async () => {
    const params = { ...buyer(99), ticketQuantity: 100 }
    await expect(createPurchase(params)).rejects.toThrow(InvalidQuantityError)
  })
})
