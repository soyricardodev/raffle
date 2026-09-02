import { customers, purchases, pushSubscriptions, raffles } from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import { beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import { listAdminPushSubscribers, savePushSubscription } from "./push.service"

const KEYS = {
  p256dh: "p256dh-key-value-at-least-20",
  auth: "auth-secret-xx",
}

describe("push subscription identity", () => {
  let raffleId: number
  let customerId: number

  beforeAll(async () => {
    await setupIsolatedTestDatabase()
    const db = getDb()
    const [raffle] = await db
      .insert(raffles)
      .values({
        name: "Identity raffle",
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
    raffleId = raffle?.id ?? 0
    if (!raffleId) throw new Error("failed to seed raffle")

    const [customer] = await db
      .insert(customers)
      .values({
        customerName: "María Pérez",
        customerPhone: "04121234567",
        customerPhoneNormalized: "04121234567",
        customerEmail: "maria@test.local",
        customerCi: "V12345678",
        customerCiNormalized: "V12345678",
        customerLocation: "Caracas",
      })
      .returning({ id: customers.id })
    customerId = customer?.id ?? 0
    if (!customerId) throw new Error("failed to seed customer")

    await db.insert(purchases).values({
      publicId: crypto.randomUUID(),
      raffleId,
      customerId,
      customerName: "María Pérez",
      customerPhone: "04121234567",
      customerPhoneNormalized: "04121234567",
      customerEmail: "maria@test.local",
      customerCi: "V12345678",
      customerLocation: "Caracas",
      paymentMethod: "pago_movil",
      ticketQuantity: 1,
      totalAmountCents: 500,
      currency: "VES",
      status: "approved",
    })
  })

  it("fills the name from the latest purchase when only the phone arrives", async () => {
    await savePushSubscription({
      endpoint: "https://push.example.com/from-phone",
      ...KEYS,
      userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/126.0.0.0 Mobile Safari/537.36",
      customerPhone: "04121234567",
    })

    const listed = await listAdminPushSubscribers()
    const row = listed.subscribers.find((item) => item.displayName === "María Pérez")
    expect(row?.device).toBe("Android · Chrome")

    const [stored] = await getDb()
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, "https://push.example.com/from-phone"))
      .limit(1)
    expect(stored?.customerPhoneNormalized).toBe("04121234567")
    expect(stored?.customerId).toBe(customerId)
  })

  it("keeps a stored name when a later sync has no identity", async () => {
    const endpoint = "https://push.example.com/keep-name"
    await savePushSubscription({
      endpoint,
      ...KEYS,
      userAgent: "vitest",
      customerName: "Juan Pérez",
      customerPhone: "04129998888",
    })
    await savePushSubscription({
      endpoint,
      ...KEYS,
      userAgent: "vitest",
    })

    const [stored] = await getDb()
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .limit(1)
    expect(stored?.displayName).toBe("Juan Pérez")
    expect(stored?.customerPhoneNormalized).toBe("04129998888")
  })

  it("prefers the name sent by the phone over the purchase name", async () => {
    await savePushSubscription({
      endpoint: "https://push.example.com/from-phone",
      ...KEYS,
      userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/126.0.0.0 Mobile Safari/537.36",
      customerName: "María López",
      customerPhone: "04121234567",
    })

    const listed = await listAdminPushSubscribers()
    const row = listed.subscribers.find((item) => item.displayName === "María López")
    expect(row).toBeTruthy()
  })

  it("stores a name even when the phone is invalid", async () => {
    await savePushSubscription({
      endpoint: "https://push.example.com/bad-phone",
      ...KEYS,
      userAgent: "vitest",
      customerName: "Ana",
      customerPhone: "abc",
    })

    const [stored] = await getDb()
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, "https://push.example.com/bad-phone"))
      .limit(1)
    expect(stored?.displayName).toBe("Ana")
    expect(stored?.customerPhoneNormalized).toBeNull()
    expect(stored?.customerId).toBeNull()
  })
})
