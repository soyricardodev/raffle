import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import { purchases, raffleBuyerPresence, raffles } from "@raffle/shared/db"
import {
  BUYER_PRESENCE_TTL_MS,
  countActiveBuyers,
  upsertBuyerPresence,
} from "./repositories/buyer-presence.repository"
import { listRecentPurchaseRows } from "./repositories/purchases.repository"
import { getRaffleLiveActivity } from "./live-activity.service"
import { getRaffleLiveSnapshot } from "./pause.service"
import { toPublicRecentPurchase } from "@raffle/shared/public-recent-purchase"

const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)("live purchase activity", () => {
  let raffleId: number

  beforeAll(async () => {
    await setupIsolatedTestDatabase()
    const db = getDb()
    const [row] = await db
      .insert(raffles)
      .values({
        name: "TEST-LiveActivity",
        description: "Rifa de prueba actividad en vivo",
        totalTickets: 100,
        priceBsCents: 500,
        priceUsdCents: 100,
        minPurchase: 1,
        maxPurchase: 10,
        drawDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
    if (!raffleId) return
    const db = getDb()
    await db.delete(raffleBuyerPresence).where(eq(raffleBuyerPresence.raffleId, raffleId))
    await db.delete(purchases).where(eq(purchases.raffleId, raffleId))
    await db.delete(raffles).where(eq(raffles.id, raffleId))
  })

  it("counts only recent presence heartbeats", async () => {
    await upsertBuyerPresence(raffleId, "client-a")
    await upsertBuyerPresence(raffleId, "client-b")

    const count = await countActiveBuyers(raffleId, BUYER_PRESENCE_TTL_MS)
    expect(count).toBe(2)
  })

  it("lists recent pending and approved purchases, excluding rejected", async () => {
    const db = getDb()
    await db.insert(purchases).values([
      {
        publicId: "pub-pending-1",
        raffleId,
        customerName: "Ana López",
        customerPhone: "04120000001",
        customerPhoneNormalized: "04120000001",
        customerEmail: "ana@example.com",
        customerCi: "V12345678",
        customerLocation: "Caracas",
        paymentMethod: "pago_movil",
        ticketQuantity: 2,
        totalAmountCents: 1000,
        currency: "VES",
        status: "pending",
        createdAt: new Date("2026-01-03T12:00:00Z"),
      },
      {
        publicId: "pub-approved-1",
        raffleId,
        customerName: "Carlos Ruiz",
        customerPhone: "04120000002",
        customerPhoneNormalized: "04120000002",
        customerEmail: "carlos@example.com",
        customerCi: "V87654321",
        customerLocation: "Maracaibo",
        paymentMethod: "pago_movil",
        ticketQuantity: 5,
        totalAmountCents: 2500,
        currency: "VES",
        status: "approved",
        createdAt: new Date("2026-01-03T13:00:00Z"),
      },
      {
        publicId: "pub-rejected-1",
        raffleId,
        customerName: "Oculto Rechazado",
        customerPhone: "04120000003",
        customerPhoneNormalized: "04120000003",
        customerEmail: "rej@example.com",
        customerCi: "V11111111",
        customerLocation: "Valencia",
        paymentMethod: "pago_movil",
        ticketQuantity: 1,
        totalAmountCents: 500,
        currency: "VES",
        status: "rejected",
        createdAt: new Date("2026-01-03T14:00:00Z"),
      },
    ])

    const rows = await listRecentPurchaseRows(raffleId, 10)
    expect(rows).toHaveLength(2)

    const recent = rows.map(toPublicRecentPurchase)
    expect(recent[0]?.id).toBe("pub-approved-1")
    expect(recent[0]?.displayName).toBe("Carlos R.")
    expect(recent[1]?.id).toBe("pub-pending-1")
    expect(recent[1]?.status).toBe("pending")
  })

  it("includes presence and recent purchases in live activity", async () => {
    const activity = await getRaffleLiveActivity(raffleId)
    expect(activity.activeBuyersCount).toBeGreaterThanOrEqual(2)
    expect(activity.recentPurchases.length).toBeGreaterThanOrEqual(2)
  })

  it("includes activity in live snapshot without side-effect prune", async () => {
    const snapshot = await getRaffleLiveSnapshot(raffleId)
    expect(snapshot).not.toBeNull()
    expect(snapshot!.activeBuyersCount).toBeGreaterThanOrEqual(2)
    expect(snapshot!.recentPurchases.length).toBeGreaterThanOrEqual(2)
    expect(snapshot!.availability).toBeDefined()
  })
})
