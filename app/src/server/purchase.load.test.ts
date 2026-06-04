import { purchases, purchaseTickets, raffles } from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import { seedPagoMovilPaymentMethodForRaffle } from "@/test/payment-methods-test-helper"
import { withTestBuyerDefaults } from "@/test/purchase-test-helper"
import { assertRaffleTicketInvariants } from "./purchase-invariants"
import { createPurchase } from "./purchase.service"

const TOTAL_TICKETS = 10_000
const TICKETS_PER_BUYER = 1

function parseConcurrencyLevels(): number[] {
  const explicit = process.env.LOAD_TEST_CONCURRENCY
  if (explicit) {
    const n = Number(explicit)
    if (Number.isInteger(n) && n > 0) return [n]
  }
  const levels = [100]
  if (process.env.RUN_FULL_LOAD_TESTS === "1") {
    levels.push(500, 1000)
  }
  return levels
}

describe("purchase load", () => {
  let raffleId: number
  let rafflePaymentMethodId: number

  beforeAll(async () => {
    await setupIsolatedTestDatabase()
    const db = getDb()
    const [row] = await db
      .insert(raffles)
      .values({
        name: "TEST-Load",
        description: "Rifa para pruebas de carga",
        totalTickets: TOTAL_TICKETS,
        priceBsCents: 100,
        priceUsdCents: 10,
        minPurchase: 1,
        maxPurchase: 50,
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

  function buyer(seq: number) {
    return withTestBuyerDefaults({
      raffleId,
      customerName: `Load Buyer ${seq}`,
      customerPhone: `0424${String(10_000 + seq).padStart(7, "0")}`,
      customerCi: `V${String(20_000_000 + seq).slice(-8)}`,
      customerEmail: `load${seq}@test.local`,
      rafflePaymentMethodId,
      paymentReference: `load-ref-${seq}-${Date.now()}`,
      ticketQuantity: TICKETS_PER_BUYER,
    })
  }

  for (const concurrency of parseConcurrencyLevels()) {
    it(
      `handles ${concurrency} concurrent purchases without overselling`,
      async () => {
        const started = performance.now()
        const buyers = Array.from({ length: concurrency }, (_, i) => buyer(i + 1))

        const results = await Promise.allSettled(buyers.map((b) => createPurchase(b)))
        const succeeded = results.filter((r) => r.status === "fulfilled").length
        const failed = results.filter((r) => r.status === "rejected").length
        const durationMs = Math.round(performance.now() - started)

        expect(succeeded).toBeGreaterThan(0)
        expect(succeeded + failed).toBe(concurrency)

        const report = await assertRaffleTicketInvariants(getDb(), raffleId)
        expect(report.uniqueTicketNumbers).toBe(report.assignedRows)
        expect(report.counterSum).toBe(TOTAL_TICKETS)
        expect(report.ticketsAvailable).toBeGreaterThanOrEqual(0)

        // eslint-disable-next-line no-console
        console.info(
          JSON.stringify({
            loadTest: true,
            concurrency,
            succeeded,
            failed,
            durationMs,
            p99EstimateMs: durationMs,
          }),
        )
      },
      180_000,
    )
  }
})
