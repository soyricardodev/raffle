import { purchases, purchaseTickets, raffles } from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import { beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import { seedPagoMovilPaymentMethodForRaffle } from "@/test/payment-methods-test-helper"
import { withTestBuyerDefaults } from "@/test/purchase-test-helper"
import { addTicketsToPurchase, createPurchase } from "./purchase.service"

describe("admin purchase ticket adjustments", () => {
  beforeAll(async () => {
    await setupIsolatedTestDatabase()
  })

  it("allows admin updates above the raffle public max purchase when stock permits", async () => {
    const db = getDb()
    const [raffle] = await db
      .insert(raffles)
      .values({
        name: "TEST-AdminTicketAdjustments",
        description: "Admin ticket adjustment test",
        totalTickets: 20,
        priceBsCents: 1000,
        priceUsdCents: 100,
        minPurchase: 1,
        maxPurchase: 5,
        drawDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "active",
        autoPauseEnabled: false,
        ticketsAvailable: 20,
        ticketsReserved: 0,
        ticketsSold: 0,
      })
      .returning({ id: raffles.id })

    const raffleId = raffle!.id
    const rafflePaymentMethodId = await seedPagoMovilPaymentMethodForRaffle(raffleId)
    const purchase = await createPurchase(
      withTestBuyerDefaults({
        raffleId,
        customerName: "Admin Test Buyer",
        customerPhone: "04121234567",
        customerCi: "V12345678",
        rafflePaymentMethodId,
        paymentReference: "admin-adjustment-ref",
        ticketQuantity: 5,
      }),
    )

    const result = await addTicketsToPurchase(purchase.purchaseId, 10, {
      adminUserId: "test-admin",
    })

    expect(result.addedTickets).toHaveLength(10)
    expect(result.newQuantity).toBe(15)

    const [updatedPurchase] = await db
      .select({ ticketQuantity: purchases.ticketQuantity })
      .from(purchases)
      .where(eq(purchases.id, purchase.purchaseId))
      .limit(1)
    expect(updatedPurchase?.ticketQuantity).toBe(15)

    const ticketRows = await db
      .select({ id: purchaseTickets.id })
      .from(purchaseTickets)
      .where(eq(purchaseTickets.purchaseId, purchase.purchaseId))
    expect(ticketRows).toHaveLength(15)

    const [updatedRaffle] = await db
      .select({
        ticketsAvailable: raffles.ticketsAvailable,
        ticketsReserved: raffles.ticketsReserved,
      })
      .from(raffles)
      .where(eq(raffles.id, raffleId))
      .limit(1)
    expect(updatedRaffle).toEqual({ ticketsAvailable: 5, ticketsReserved: 15 })
  })
})
