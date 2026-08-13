import { purchases, purchaseTickets, raffles } from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import { beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import { seedPagoMovilPaymentMethodForRaffle } from "@/test/payment-methods-test-helper"
import { withTestBuyerDefaults } from "@/test/purchase-test-helper"
import { pauseRaffle } from "./pause.service"
import {
  addTicketsToPurchase,
  createPurchase,
  removeTicketsFromPurchase,
  updatePurchaseStatus,
} from "./purchase.service"

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
        paymentReference: "1002003004",
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

  it("finishes on sell-out and reactivates when tickets are released", async () => {
    const db = getDb()
    const [raffle] = await db
      .insert(raffles)
      .values({
        name: "TEST-LifecycleFinishReactivate",
        description: "Finish and reactivate on release",
        totalTickets: 5,
        priceBsCents: 1000,
        priceUsdCents: 100,
        minPurchase: 1,
        maxPurchase: 5,
        drawDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "active",
        autoPauseEnabled: true,
        ticketsAvailable: 5,
        ticketsReserved: 0,
        ticketsSold: 0,
      })
      .returning({ id: raffles.id })

    const raffleId = raffle!.id
    const rafflePaymentMethodId = await seedPagoMovilPaymentMethodForRaffle(raffleId)
    const purchase = await createPurchase(
      withTestBuyerDefaults({
        raffleId,
        customerName: "Lifecycle Buyer",
        customerPhone: "04121112233",
        customerCi: "V87654321",
        rafflePaymentMethodId,
        paymentReference: `${Date.now()}`.slice(-12),
        ticketQuantity: 5,
      }),
    )

    const [soldOut] = await db.select().from(raffles).where(eq(raffles.id, raffleId)).limit(1)
    expect(soldOut!.status).toBe("finished")
    expect(soldOut!.ticketsAvailable).toBe(0)
    expect(soldOut!.pauseReason).toBeNull()

    await updatePurchaseStatus(purchase.purchaseId, "rejected", undefined, {
      adminUserId: "test-admin",
    })

    const [reactivated] = await db.select().from(raffles).where(eq(raffles.id, raffleId)).limit(1)
    expect(reactivated!.status).toBe("active")
    expect(reactivated!.ticketsAvailable).toBe(5)
  })

  it("keeps a manually paused raffle paused after releasing tickets", async () => {
    const db = getDb()
    const [raffle] = await db
      .insert(raffles)
      .values({
        name: "TEST-ManualPausePreserved",
        description: "Manual pause must stay paused",
        totalTickets: 10,
        priceBsCents: 1000,
        priceUsdCents: 100,
        minPurchase: 1,
        maxPurchase: 5,
        drawDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "active",
        autoPauseEnabled: true,
        ticketsAvailable: 10,
        ticketsReserved: 0,
        ticketsSold: 0,
      })
      .returning({ id: raffles.id })

    const raffleId = raffle!.id
    const rafflePaymentMethodId = await seedPagoMovilPaymentMethodForRaffle(raffleId)
    const purchase = await createPurchase(
      withTestBuyerDefaults({
        raffleId,
        customerName: "Paused Buyer",
        customerPhone: "04123334455",
        customerCi: "V11223344",
        rafflePaymentMethodId,
        paymentReference: `${Date.now() + 1}`.slice(-12),
        ticketQuantity: 3,
      }),
    )

    const paused = await pauseRaffle(raffleId, "manual")
    expect(paused.success).toBe(true)

    await removeTicketsFromPurchase(purchase.purchaseId, 1, { adminUserId: "test-admin" })

    const [stillPaused] = await db.select().from(raffles).where(eq(raffles.id, raffleId)).limit(1)
    expect(stillPaused!.status).toBe("paused")
    expect(stillPaused!.pauseReason).toBe("manual")
    expect(stillPaused!.ticketsAvailable).toBe(8)
  })
})
