import { raffles } from "@raffle/shared/db"
import { beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { listAdminRaffles } from "@/server/raffle.service"
import { setupIsolatedTestDatabase } from "@/test/db-setup"

describe("listAdminRaffles cancelled filter", () => {
  beforeAll(async () => {
    await setupIsolatedTestDatabase()
  })

  it("excludes cancelled raffles from status=all", async () => {
    const db = getDb()
    await db.insert(raffles).values([
      {
        name: "TEST-ActiveRaffle",
        totalTickets: 10,
        priceBsCents: 1000,
        priceUsdCents: 100,
        minPurchase: 1,
        maxPurchase: 5,
        status: "active",
        ticketsAvailable: 10,
        ticketsReserved: 0,
        ticketsSold: 0,
      },
      {
        name: "TEST-CancelledRaffle",
        totalTickets: 10,
        priceBsCents: 1000,
        priceUsdCents: 100,
        minPurchase: 1,
        maxPurchase: 5,
        status: "cancelled",
        ticketsAvailable: 10,
        ticketsReserved: 0,
        ticketsSold: 0,
      },
    ])

    const allResult = await listAdminRaffles({ status: "all", limit: 100, page: 1 })
    const cancelledResult = await listAdminRaffles({ status: "cancelled", limit: 100, page: 1 })

    expect(allResult.data.some((row) => row.name === "TEST-ActiveRaffle")).toBe(true)
    expect(allResult.data.some((row) => row.name === "TEST-CancelledRaffle")).toBe(false)
    expect(cancelledResult.data.some((row) => row.name === "TEST-CancelledRaffle")).toBe(true)
    expect(cancelledResult.data.some((row) => row.name === "TEST-ActiveRaffle")).toBe(false)
  })
})
