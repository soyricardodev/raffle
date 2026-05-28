import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import { raffles } from "@raffle/shared/db"
import { transitionRaffle } from "./raffle-lifecycle.service"
import { RaffleInvalidTransitionError } from "@raffle/shared/errors"

const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)("raffle lifecycle (integration)", () => {
  let raffleId: number

  beforeAll(async () => {
    await setupIsolatedTestDatabase()
    const db = getDb()
    const [row] = await db
      .insert(raffles)
      .values({
        name: "TEST-Lifecycle",
        description: "Integration test",
        totalTickets: 100,
        priceBsCents: 500,
        priceUsdCents: 100,
        minPurchase: 1,
        maxPurchase: 5,
        status: "active",
        autoPauseEnabled: false,
        ticketsAvailable: 100,
        ticketsReserved: 0,
        ticketsSold: 0,
      })
      .returning({ id: raffles.id })
    raffleId = row!.id
  })

  afterAll(async () => {
    const db = getDb()
    await db.delete(raffles).where(eq(raffles.id, raffleId))
  })

  it("finishes an active raffle and clears pause metadata", async () => {
    await transitionRaffle(raffleId, { intent: "finish" })

    const db = getDb()
    const [row] = await db.select().from(raffles).where(eq(raffles.id, raffleId))
    expect(row?.status).toBe("finished")
    expect(row?.pauseUntil).toBeNull()
    expect(row?.pauseReason).toBeNull()
  })

  it("rejects invalid set_status from finished to paused", async () => {
    await expect(
      transitionRaffle(raffleId, { intent: "set_status", status: "paused" }),
    ).rejects.toBeInstanceOf(RaffleInvalidTransitionError)
  })
})
