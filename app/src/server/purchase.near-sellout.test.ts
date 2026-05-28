import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import { paymentMethods, purchaseTickets, purchases, raffles } from "@raffle/shared/db"
import { createPurchase } from "./purchase.service"

const TOTAL = 10_000
const PRE_SOLD = 9_950
const FINAL_BATCH = 50
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)("purchase near sellout", () => {
  let raffleId: number
  let anchorPurchaseId: number

  beforeAll(async () => {
    await setupIsolatedTestDatabase()
    const db = getDb()

    const [row] = await db
      .insert(raffles)
      .values({
        name: "TEST-NearSellout",
        description: "Casi agotada",
        totalTickets: TOTAL,
        priceBsCents: 100,
        priceUsdCents: 1,
        minPurchase: 1,
        maxPurchase: 50,
        drawDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "active",
        autoPauseEnabled: false,
        ticketsAvailable: FINAL_BATCH,
        ticketsReserved: 0,
        ticketsSold: PRE_SOLD,
      })
      .returning({ id: raffles.id })

    raffleId = row!.id

    await db.insert(paymentMethods).values({
      raffleId,
      methodType: "pago_movil",
      accountInfo: JSON.stringify({ banco: "Test", telefono: "04120000000", cedula: "V12345678" }),
      isActive: true,
      minTickets: null,
    })

    const [purchase] = await db
      .insert(purchases)
      .values({
        publicId: crypto.randomUUID(),
        raffleId,
        customerName: "Anchor Buyer",
        customerPhone: "04120000001",
        customerPhoneNormalized: "04120000001",
        paymentMethod: "pago_movil",
        paymentReference: "anchor-near-sellout",
        ticketQuantity: PRE_SOLD,
        totalAmountCents: PRE_SOLD * 100,
        currency: "VES",
        status: "approved",
      })
      .returning({ id: purchases.id })

    anchorPurchaseId = purchase!.id

    const ticketRows = Array.from({ length: PRE_SOLD }, (_, i) => ({
      raffleId,
      purchaseId: anchorPurchaseId,
      ticketNumber: i,
      status: "sold" as const,
    }))

    const CHUNK = 500
    for (let offset = 0; offset < ticketRows.length; offset += CHUNK) {
      await db.insert(purchaseTickets).values(ticketRows.slice(offset, offset + CHUNK))
    }
  })

  afterAll(async () => {
    if (!raffleId) return
    const db = getDb()
    await db.delete(purchaseTickets).where(eq(purchaseTickets.raffleId, raffleId))
    await db.delete(purchases).where(eq(purchases.raffleId, raffleId))
    await db.delete(paymentMethods).where(eq(paymentMethods.raffleId, raffleId))
    await db.delete(raffles).where(eq(raffles.id, raffleId))
  })

  it("allocates the last free tickets when almost sold out", async () => {
    const result = await createPurchase({
      raffleId,
      customerName: "Final Buyer",
      customerPhone: "04129999999",
      paymentMethod: "pago_movil",
      paymentReference: `near-sellout-${Date.now()}`,
      ticketQuantity: FINAL_BATCH,
    })

    expect(result.ticketNumbers).toHaveLength(FINAL_BATCH)

    const db = getDb()
    const [raffle] = await db.select().from(raffles).where(eq(raffles.id, raffleId)).limit(1)
    expect(raffle!.ticketsAvailable).toBe(0)
    expect(raffle!.ticketsSold).toBe(PRE_SOLD)
    expect(raffle!.ticketsReserved).toBe(FINAL_BATCH)
    expect(raffle!.ticketsAvailable + raffle!.ticketsReserved + raffle!.ticketsSold).toBe(TOTAL)
  })
})
