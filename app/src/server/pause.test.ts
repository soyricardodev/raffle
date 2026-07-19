import { purchases, purchaseTickets, raffles } from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import {
  checkAutoPause,
  checkTicketAvailability,
  getPauseInfo,
  pauseRaffle,
  unpauseRaffle,
} from "./pause.service"

const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)("pause system", () => {
  let raffleId: number

  beforeAll(async () => {
    await setupIsolatedTestDatabase()
    const db = getDb()
    const [row] = await db
      .insert(raffles)
      .values({
        name: "TEST-Pause",
        description: "Rifa de prueba para tests de pausa",
        totalTickets: 10,
        priceBsCents: 500,
        priceUsdCents: 100,
        minPurchase: 2,
        maxPurchase: 5,
        drawDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "active",
        autoPauseEnabled: true,
        ticketsAvailable: 10,
        ticketsReserved: 0,
        ticketsSold: 0,
      })
      .returning({ id: raffles.id })

    raffleId = row!.id
  })

  afterAll(async () => {
    if (!raffleId) return
    const db = getDb()
    await db.delete(purchaseTickets).where(eq(purchaseTickets.raffleId, raffleId))
    await db.delete(purchases).where(eq(purchases.raffleId, raffleId))
    await db.delete(raffles).where(eq(raffles.id, raffleId))
  })

  it("reports initial availability correctly", async () => {
    const av = await checkTicketAvailability(raffleId)
    expect(av.total).toBe(10)
    expect(av.available).toBe(10)
    expect(av.sold).toBe(0)
    expect(av.isFull).toBe(false)
  })

  it("does not trigger auto-pause when tickets are available", async () => {
    const result = await checkAutoPause(raffleId)
    expect(result.needsPause).toBe(false)
    expect(result.availability?.available).toBe(10)
  })

  it("performs manual pause successfully", async () => {
    const result = await pauseRaffle(raffleId, "manual", 10)
    expect(result.success).toBe(true)
    expect(result.pauseUntil).toBeDefined()
    expect(result.reason).toBe("manual")
  })

  it("cannot pause a raffle that is already paused", async () => {
    const result = await pauseRaffle(raffleId, "manual")
    expect(result.success).toBe(false)
  })

  it("unpauses raffle successfully", async () => {
    const result = await unpauseRaffle(raffleId)
    expect(result.success).toBe(true)
    expect(result.message).toContain("reactivada")
  })

  it("returns pause info for active raffle", async () => {
    const info = await getPauseInfo(raffleId)
    if (!info) throw new Error("Pause info returned null")
    expect(info.status).toBe("active")
    expect(info.isPaused).toBe(false)
    expect(info.autoPauseEnabled).toBe(true)
    expect(info.availability.available).toBe(10)
    expect(info.availability.isFull).toBe(false)
  })

  it("triggers auto-pause when all tickets are sold", async () => {
    const db = getDb()
    await db
      .update(raffles)
      .set({ ticketsAvailable: 0, ticketsReserved: 0, ticketsSold: 10 })
      .where(eq(raffles.id, raffleId))

    const checkResult = await checkAutoPause(raffleId)
    expect(checkResult.needsPause).toBe(true)
    expect(checkResult.pauseType).toBe("auto_full")

    await db
      .update(raffles)
      .set({ ticketsAvailable: 10, ticketsReserved: 0, ticketsSold: 0 })
      .where(eq(raffles.id, raffleId))
  })

  it("does not auto-pause when available < minPurchase", async () => {
    const db = getDb()
    await db
      .update(raffles)
      .set({ ticketsAvailable: 1, ticketsReserved: 0, ticketsSold: 9 })
      .where(eq(raffles.id, raffleId))

    const checkResult = await checkAutoPause(raffleId)
    expect(checkResult.needsPause).toBe(false)
    expect(checkResult.availability?.available).toBe(1)

    await db
      .update(raffles)
      .set({ ticketsAvailable: 10, ticketsReserved: 0, ticketsSold: 0 })
      .where(eq(raffles.id, raffleId))
  })
})
