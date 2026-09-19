import { emailLogs, purchases, raffles } from "@raffle/shared/db"
import { beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import {
  listActiveRaffleIds,
  listPendingNotificationPurchases,
} from "./notification-dispatch.repository"

async function createRaffle(name: string, status: string): Promise<number> {
  const [row] = await getDb()
    .insert(raffles)
    .values({
      name,
      status,
      totalTickets: 500,
      priceBsCents: 1_000,
      priceUsdCents: 100,
    })
    .returning({ id: raffles.id })

  return Number(row?.id)
}

async function createPurchase(input: {
  raffleId: number
  publicId: string
  email: string
  status?: string
}): Promise<number> {
  const [row] = await getDb()
    .insert(purchases)
    .values({
      publicId: input.publicId,
      raffleId: input.raffleId,
      customerName: "Cliente",
      customerPhone: "04140000000",
      customerPhoneNormalized: "584140000000",
      customerEmail: input.email,
      paymentMethod: "pago_movil",
      ticketQuantity: 2,
      totalAmountCents: 1_000,
      currency: "VES",
      status: input.status ?? "approved",
    })
    .returning({ id: purchases.id })

  return Number(row?.id)
}

describe("notification dispatch repository", () => {
  let raffleId = 0
  let otherRaffleId = 0

  beforeAll(async () => {
    await setupIsolatedTestDatabase()
    raffleId = await createRaffle("Rifa activa", "active")
    otherRaffleId = await createRaffle("Rifa pausada", "paused")
  })

  it("lists only active raffles for the scheduled tick", async () => {
    await expect(listActiveRaffleIds()).resolves.toEqual([raffleId])
  })

  it("drops every purchase of a recipient once a notification reached them", async () => {
    const first = await createPurchase({
      raffleId,
      publicId: "00000000-0000-4000-8000-000000000001",
      email: "ana@example.com",
    })
    const second = await createPurchase({
      raffleId,
      publicId: "00000000-0000-4000-8000-000000000002",
      email: "ana@example.com",
    })
    const untouched = await createPurchase({
      raffleId,
      publicId: "00000000-0000-4000-8000-000000000003",
      email: "luis@example.com",
    })

    const before = await listPendingNotificationPurchases(raffleId)
    expect(before.map((row) => row.purchaseId).sort((a, b) => a - b)).toEqual(
      [first, second, untouched].sort((a, b) => a - b),
    )

    // One consolidated email is logged against the newest purchase of the group.
    await getDb()
      .insert(emailLogs)
      .values({
        purchaseId: second,
        recipientEmail: "ana@example.com",
        emailType: "status_update",
        subject: "Compras aprobadas",
        status: "sent",
        metadata: JSON.stringify({ consolidated_purchase_ids: [first, second] }),
      })

    const after = await listPendingNotificationPurchases(raffleId)
    expect(after.map((row) => row.purchaseId)).toEqual([untouched])
  })

  it("keeps other raffles and rejected purchases out of the queue", async () => {
    const sameRecipientOtherRaffle = await createPurchase({
      raffleId: otherRaffleId,
      publicId: "00000000-0000-4000-8000-000000000004",
      email: "ana@example.com",
    })
    await createPurchase({
      raffleId,
      publicId: "00000000-0000-4000-8000-000000000005",
      email: "rejected@example.com",
      status: "rejected",
    })

    const pending = await listPendingNotificationPurchases(raffleId)
    expect(pending.map((row) => row.purchaseId)).not.toContain(sameRecipientOtherRaffle)
    expect(pending.map((row) => row.email)).not.toContain("rejected@example.com")

    const otherRafflePending = await listPendingNotificationPurchases(otherRaffleId)
    expect(otherRafflePending.map((row) => row.purchaseId)).toEqual([sameRecipientOtherRaffle])
  })
})
