import { raffles } from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import { beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import { seedPagoMovilPaymentMethodForRaffle } from "@/test/payment-methods-test-helper"
import { withTestBuyerDefaults } from "@/test/purchase-test-helper"
import { createPurchase } from "./purchase.service"
import {
  resolvePublicVerifyRaffleId,
  verifyPublicTickets,
} from "./ticket-verify.service"

describe("ticket verify service", () => {
  beforeAll(async () => {
    await setupIsolatedTestDatabase()
  })

  async function insertRaffle(input: {
    name: string
    status: "active" | "paused" | "finished"
    createdAt?: Date
    updatedAt?: Date
  }) {
    const db = getDb()
    const [row] = await db
      .insert(raffles)
      .values({
        name: input.name,
        description: input.name,
        totalTickets: 20,
        priceBsCents: 1000,
        priceUsdCents: 100,
        minPurchase: 1,
        maxPurchase: 10,
        drawDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: input.status,
        autoPauseEnabled: false,
        ticketsAvailable: input.status === "finished" ? 0 : 20,
        ticketsReserved: 0,
        ticketsSold: input.status === "finished" ? 20 : 0,
        createdAt: input.createdAt ?? new Date(),
        updatedAt: input.updatedAt ?? new Date(),
      })
      .returning({ id: raffles.id })
    return row!.id
  }

  it("prefers the newest active/paused campaign over finished ones", async () => {
    const olderFinished = await insertRaffle({
      name: "VERIFY-OlderFinished",
      status: "finished",
      updatedAt: new Date(Date.now() - 60_000),
    })
    const current = await insertRaffle({
      name: "VERIFY-CurrentActive",
      status: "active",
      createdAt: new Date(),
    })

    expect(await resolvePublicVerifyRaffleId()).toBe(current)
    expect(await resolvePublicVerifyRaffleId()).not.toBe(olderFinished)
  })

  it("falls back to the newest finished campaign when none are active/paused", async () => {
    const db = getDb()
    await db.update(raffles).set({ status: "cancelled" }).where(eq(raffles.status, "active"))
    await db.update(raffles).set({ status: "cancelled" }).where(eq(raffles.status, "paused"))

    const older = await insertRaffle({
      name: "VERIFY-FinishedOlder",
      status: "finished",
      updatedAt: new Date(Date.now() - 120_000),
    })
    const newest = await insertRaffle({
      name: "VERIFY-FinishedNewest",
      status: "finished",
      updatedAt: new Date(),
    })

    expect(await resolvePublicVerifyRaffleId()).toBe(newest)
    expect(await resolvePublicVerifyRaffleId()).not.toBe(older)
  })

  it("isolates ticket search to the resolved public campaign", async () => {
    const finishedId = await insertRaffle({
      name: "VERIFY-ScopeFinished",
      status: "finished",
      updatedAt: new Date(Date.now() - 30_000),
    })
    const activeId = await insertRaffle({
      name: "VERIFY-ScopeActive",
      status: "active",
      createdAt: new Date(),
    })

    const finishedPm = await seedPagoMovilPaymentMethodForRaffle(finishedId)
    const activePm = await seedPagoMovilPaymentMethodForRaffle(activeId)

    // Seed purchases into finished raffle by temporarily activating it.
    const db = getDb()
    await db
      .update(raffles)
      .set({ status: "active", ticketsAvailable: 20, ticketsSold: 0 })
      .where(eq(raffles.id, finishedId))

    const finishedPurchase = await createPurchase(
      withTestBuyerDefaults({
        raffleId: finishedId,
        customerName: "Finished Buyer",
        customerPhone: "04125556677",
        customerCi: "V55556666",
        rafflePaymentMethodId: finishedPm,
        paymentReference: `${Date.now()}`.slice(-12),
        ticketQuantity: 1,
      }),
    )

    await db
      .update(raffles)
      .set({ status: "finished", ticketsAvailable: 0, ticketsSold: 20, ticketsReserved: 0 })
      .where(eq(raffles.id, finishedId))

    const activePurchase = await createPurchase(
      withTestBuyerDefaults({
        raffleId: activeId,
        customerName: "Active Buyer",
        customerPhone: "04125556677",
        customerCi: "V55556666",
        rafflePaymentMethodId: activePm,
        paymentReference: `${Date.now() + 7}`.slice(-12),
        ticketQuantity: 1,
      }),
    )

    const byPhone = await verifyPublicTickets({ phone: "+58 412 5556677" })
    expect(byPhone).toHaveLength(1)
    expect(byPhone[0]?.raffle_id).toBe(activeId)
    expect(byPhone[0]?.purchase_id).toBe(activePurchase.purchaseId)

    const byTicket = await verifyPublicTickets({
      ticketNumber: finishedPurchase.ticketNumbers[0],
    })
    expect(byTicket).toHaveLength(0)

    // When only finished remains, verify still finds that campaign's tickets.
    await db.update(raffles).set({ status: "cancelled" }).where(eq(raffles.id, activeId))
    await db
      .update(raffles)
      .set({ updatedAt: new Date() })
      .where(eq(raffles.id, finishedId))
    const finishedOnly = await verifyPublicTickets({ phone: "04125556677" })
    expect(finishedOnly).toHaveLength(1)
    expect(finishedOnly[0]?.raffle_id).toBe(finishedId)
    expect(finishedOnly[0]?.purchase_id).toBe(finishedPurchase.purchaseId)
  })
})
