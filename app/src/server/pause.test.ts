import { raffles } from "@raffle/shared/db"
import { beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import {
  checkTicketAvailability,
  getPauseInfo,
  pauseRaffle,
  unpauseRaffle,
} from "./pause.service"

describe("pause system", () => {
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

  it("reports initial availability correctly", async () => {
    const av = await checkTicketAvailability(raffleId)
    expect(av.total).toBe(10)
    expect(av.available).toBe(10)
    expect(av.sold).toBe(0)
    expect(av.isFull).toBe(false)
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
})
