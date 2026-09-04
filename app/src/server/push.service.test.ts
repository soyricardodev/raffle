import { rafflePromotions, raffles } from "@raffle/shared/db"
import { parsePushMilestonesSent } from "@raffle/shared/push"
import { eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { getDb } from "@/lib/db.server"
import { resetEnvCache } from "@/lib/env"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import {
  listAdminPushSubscribers,
  listPushInbox,
  markPushInboxRead,
  notifyNewRaffle,
  notifyPromotion,
  notifySaleMilestones,
  resetWebPushClientForTests,
  savePushSubscription,
  seedPushMilestonesForExistingProgress,
  sendManualBroadcast,
  setWebPushClientForTests,
} from "./push.service"

const sendNotification = vi.fn().mockResolvedValue({ statusCode: 201 })

describe("push.service milestones", () => {
  let raffleId: number

  beforeAll(async () => {
    await setupIsolatedTestDatabase()
    process.env.VAPID_PUBLIC_KEY = "test-vapid-public-key-value-xx"
    process.env.VAPID_PRIVATE_KEY = "test-vapid-private-key-value"
    process.env.APP_URL = "http://localhost:3000"
    resetEnvCache()
    resetWebPushClientForTests()
    setWebPushClientForTests({
      setVapidDetails: vi.fn(),
      sendNotification,
    })

    const db = getDb()
    const [row] = await db
      .insert(raffles)
      .values({
        name: "iPhone 16",
        totalTickets: 100,
        priceBsCents: 500,
        priceUsdCents: 100,
        minPurchase: 1,
        maxPurchase: 5,
        status: "active",
        autoPauseEnabled: false,
        ticketsAvailable: 40,
        ticketsReserved: 0,
        ticketsSold: 60,
      })
      .returning({ id: raffles.id })
    raffleId = row!.id

    await savePushSubscription({
      endpoint: "https://push.example.com/sub-1",
      p256dh: "p256dh-key-value-at-least-20",
      auth: "auth-secret-xx",
      userAgent: "vitest",
    })
  })

  afterAll(() => {
    resetWebPushClientForTests()
    delete process.env.VAPID_PUBLIC_KEY
    delete process.env.VAPID_PRIVATE_KEY
    resetEnvCache()
  })

  it("sends the highest crossed sale milestone and does not repeat it", async () => {
    sendNotification.mockClear()
    await notifySaleMilestones(raffleId)

    expect(sendNotification).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(sendNotification.mock.calls[0]![1] as string) as {
      title: string
      tag: string
    }
    expect(payload.title).toBe("Último 50% disponible.")
    expect(payload.tag).toBe(`raffle-${raffleId}-alert:4`)

    const db = getDb()
    const [row] = await db.select().from(raffles).where(eq(raffles.id, raffleId)).limit(1)
    expect(row?.pushMilestonesSent).toContain("alert:2")
    expect(row?.pushMilestonesSent).toContain("alert:3")
    expect(row?.pushMilestonesSent).toContain("alert:4")

    sendNotification.mockClear()
    await notifySaleMilestones(raffleId)
    expect(sendNotification).not.toHaveBeenCalled()

    const listed = await listAdminPushSubscribers()
    expect(listed.plan.raffle?.id).toBe(raffleId)
    expect(listed.plan.milestones.find((row) => row.alertId === 4)).toMatchObject({
      status: "sent",
      recipientCount: 1,
    })
    expect(listed.plan.milestones.find((row) => row.alertId === 2)?.status).toBe("skipped")
    expect(listed.plan.milestones.find((row) => row.alertId === 1)).toMatchObject({
      status: "upcoming",
      isNext: true,
    })
    expect(listed.plan.milestones.find((row) => row.alertId === 5)).toMatchObject({
      status: "upcoming",
      ticketsRemaining: 10,
    })
  })

  it("sends the highest milestone from occupied tickets, not only sold", async () => {
    const db = getDb()
    const [row] = await db
      .insert(raffles)
      .values({
        name: "Moto 0km",
        totalTickets: 100,
        priceBsCents: 500,
        priceUsdCents: 100,
        minPurchase: 1,
        maxPurchase: 5,
        status: "draft",
        autoPauseEnabled: false,
        ticketsAvailable: 40,
        ticketsReserved: 55,
        ticketsSold: 5,
      })
      .returning({ id: raffles.id })
    const occupiedRaffleId = row!.id

    sendNotification.mockClear()
    await notifySaleMilestones(occupiedRaffleId)

    expect(sendNotification).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(sendNotification.mock.calls[0]![1] as string) as {
      title: string
      tag: string
    }
    expect(payload.title).toBe("Último 50% disponible.")
    expect(payload.tag).toBe(`raffle-${occupiedRaffleId}-alert:4`)

    const [updated] = await db.select().from(raffles).where(eq(raffles.id, occupiedRaffleId)).limit(1)
    expect(updated?.pushMilestonesSent).toContain("alert:2")
    expect(updated?.pushMilestonesSent).toContain("alert:3")
    expect(updated?.pushMilestonesSent).toContain("alert:4")
    expect(updated?.pushMilestonesSent).not.toContain("alert:5")
  })

  it("seeds already crossed milestones without sending any push", async () => {
    const db = getDb()
    const [row] = await db
      .insert(raffles)
      .values({
        name: "Importada al 95%",
        totalTickets: 100,
        priceBsCents: 500,
        priceUsdCents: 100,
        minPurchase: 1,
        maxPurchase: 5,
        status: "finished",
        autoPauseEnabled: false,
        ticketsAvailable: 5,
        ticketsReserved: 0,
        ticketsSold: 95,
      })
      .returning({ id: raffles.id })
    const importedRaffleId = row!.id

    sendNotification.mockClear()
    const seeded = await seedPushMilestonesForExistingProgress(importedRaffleId)

    expect(seeded).toBe(true)
    expect(sendNotification).not.toHaveBeenCalled()

    const [updated] = await db.select().from(raffles).where(eq(raffles.id, importedRaffleId)).limit(1)
    expect(parsePushMilestonesSent(updated?.pushMilestonesSent)).toEqual(
      expect.arrayContaining(["alert:2", "alert:3", "alert:4", "alert:5", "alert:6"]),
    )

    sendNotification.mockClear()
    await notifySaleMilestones(importedRaffleId)
    expect(sendNotification).not.toHaveBeenCalled()

    const seededAgain = await seedPushMilestonesForExistingProgress(importedRaffleId)
    expect(seededAgain).toBe(false)
  })

  it("sends new raffle once", async () => {
    sendNotification.mockClear()
    await notifyNewRaffle(raffleId)
    expect(sendNotification).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(sendNotification.mock.calls[0]![1] as string) as { title: string }
    expect(payload.title).toBe("Nueva bendición liberada.")

    sendNotification.mockClear()
    await notifyNewRaffle(raffleId)
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it("lists the device without leaking the endpoint and sends a manual aviso", async () => {
    const listed = await listAdminPushSubscribers()
    expect(listed.count).toBeGreaterThanOrEqual(1)
    expect(listed.subscribers[0]?.device).toBe("Navegador")
    expect(listed.subscribers[0]?.displayName).toBeNull()
    expect(JSON.stringify(listed)).not.toMatch(/push\.example/)

    sendNotification.mockClear()
    const result = await sendManualBroadcast({
      title: "Hola",
      body: "Esto es una prueba",
    })
    expect(result.sent).toBeGreaterThanOrEqual(1)
    expect(sendNotification).toHaveBeenCalled()
    const payload = JSON.parse(sendNotification.mock.calls[0]![1] as string) as {
      title: string
      body: string
    }
    expect(payload.title).toBe("Hola")
    expect(payload.body).toBe("Esto es una prueba")
  })

  it("sends a promotion aviso once and lists it in the plan", async () => {
    const db = getDb()
    const [promo] = await db
      .insert(rafflePromotions)
      .values({
        raffleId,
        name: "20% de descuento",
        kind: "percentage",
        scope: "all_methods",
        isActive: true,
        discountPercentBps: 2000,
      })
      .returning({ id: rafflePromotions.id })

    const promotionId = promo?.id
    if (!promotionId) throw new Error("failed to create promotion")

    sendNotification.mockClear()
    await notifyPromotion(raffleId, promotionId)
    expect(sendNotification).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(String(sendNotification.mock.calls[0]?.[1])) as { title: string }
    expect(payload.title).toBe("Hay una promo.")

    sendNotification.mockClear()
    await notifyPromotion(raffleId, promotionId)
    expect(sendNotification).not.toHaveBeenCalled()

    const listed = await listAdminPushSubscribers()
    expect(listed.plan.promotions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          promotionId,
          status: "sent",
          recipientCount: 1,
        }),
      ]),
    )
  })

  it("replaces older sale-progress avisos in the inbox but sends every webpush", async () => {
    const db = getDb()
    const [row] = await db
      .insert(raffles)
      .values({
        name: "Baratica recargada 1.0",
        totalTickets: 100,
        priceBsCents: 500,
        priceUsdCents: 100,
        minPurchase: 1,
        maxPurchase: 5,
        status: "active",
        autoPauseEnabled: false,
        ticketsAvailable: 70,
        ticketsReserved: 0,
        ticketsSold: 30,
      })
      .returning({ id: raffles.id })
    const progressRaffleId = row!.id

    sendNotification.mockClear()
    await notifySaleMilestones(progressRaffleId)
    expect(sendNotification).toHaveBeenCalledTimes(1)
    const first = JSON.parse(String(sendNotification.mock.calls[0]?.[1])) as {
      title: string
      tag: string
    }
    expect(first.title).toBe("Último 70% disponible.")
    expect(first.tag).toBe(`raffle-${progressRaffleId}-alert:3`)

    await db
      .update(raffles)
      .set({ ticketsSold: 50, ticketsAvailable: 50, updatedAt: new Date() })
      .where(eq(raffles.id, progressRaffleId))

    sendNotification.mockClear()
    await notifySaleMilestones(progressRaffleId)
    expect(sendNotification).toHaveBeenCalledTimes(1)
    const second = JSON.parse(String(sendNotification.mock.calls[0]?.[1])) as {
      title: string
      tag: string
    }
    expect(second.title).toBe("Último 50% disponible.")
    expect(second.tag).toBe(`raffle-${progressRaffleId}-alert:4`)
    expect(second.tag).not.toBe(first.tag)

    const inbox = await listPushInbox("https://push.example.com/sub-1")
    const progressTitles = inbox.items
      .filter((item) => item.body === "Baratica recargada 1.0")
      .map((item) => item.title)
    expect(progressTitles).toEqual(["Último 50% disponible."])
    expect(
      inbox.items.some(
        (item) => item.body === "iPhone 16" && item.title === "Último 50% disponible.",
      ),
    ).toBe(false)
  })

  it("lists inbox items for a subscriber and marks them read", async () => {
    sendNotification.mockClear()
    await sendManualBroadcast({
      title: "Aviso de prueba",
      body: "Revisa tus boletos",
    })

    const inbox = await listPushInbox("https://push.example.com/sub-1")
    expect(inbox.items.length).toBeGreaterThan(0)
    expect(inbox.unreadCount).toBeGreaterThan(0)
    expect(inbox.items[0]?.title).toBe("Aviso de prueba")
    expect(inbox.items[0]?.read).toBe(false)

    const afterOne = await markPushInboxRead({
      endpoint: "https://push.example.com/sub-1",
      ids: [inbox.items[0]!.id],
    })
    expect(afterOne.items.find((row) => row.id === inbox.items[0]?.id)?.read).toBe(true)

    const afterAll = await markPushInboxRead({
      endpoint: "https://push.example.com/sub-1",
      all: true,
    })
    expect(afterAll.unreadCount).toBe(0)
    expect(afterAll.items.every((row) => row.read)).toBe(true)
  })

  it("hides the inbox from an unknown endpoint", async () => {
    const inbox = await listPushInbox("https://push.example.com/unknown")
    expect(inbox).toEqual({ items: [], unreadCount: 0 })
  })
})
