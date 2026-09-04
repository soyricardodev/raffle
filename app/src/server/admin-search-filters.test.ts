import { purchases, purchaseTickets, raffles } from "@raffle/shared/db"
import { beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { listAdminPurchases } from "@/server/purchase.service"
import { lookupAdminTicketByNumber } from "@/server/ticket.service"
import { setupIsolatedTestDatabase } from "@/test/db-setup"

async function seedPurchaseWithTicket(params: {
  raffleId: number
  raffleName: string
  customerName: string
  ticketNumber: number
}) {
  const db = getDb()
  const [purchase] = await db
    .insert(purchases)
    .values({
      publicId: crypto.randomUUID(),
      raffleId: params.raffleId,
      customerName: params.customerName,
      customerPhone: "04120000000",
      customerPhoneNormalized: "04120000000",
      customerEmail: "buyer@test.local",
      customerCi: "V12345678",
      customerLocation: "Caracas",
      paymentMethod: "pago_movil",
      paymentReference: `ref-${params.customerName}`,
      ticketQuantity: 1,
      totalAmountCents: 1000,
      currency: "VES",
      status: "approved",
    })
    .returning({ id: purchases.id })

  await db.insert(purchaseTickets).values({
    raffleId: params.raffleId,
    purchaseId: purchase!.id,
    ticketNumber: params.ticketNumber,
    status: "sold",
  })

  return purchase!.id
}

describe("admin ticket lookup raffle scope", () => {
  beforeAll(async () => {
    await setupIsolatedTestDatabase()
  })

  it("filters by raffle when raffleId is provided", async () => {
    const db = getDb()
    const [raffleA, raffleB] = await db
      .insert(raffles)
      .values([
        {
          name: "TEST-LookupRaffleA",
          totalTickets: 10,
          priceBsCents: 1000,
          priceUsdCents: 100,
          minPurchase: 1,
          maxPurchase: 5,
          status: "active",
          ticketsAvailable: 8,
          ticketsReserved: 0,
          ticketsSold: 2,
        },
        {
          name: "TEST-LookupRaffleB",
          totalTickets: 10,
          priceBsCents: 1000,
          priceUsdCents: 100,
          minPurchase: 1,
          maxPurchase: 5,
          status: "finished",
          ticketsAvailable: 9,
          ticketsReserved: 0,
          ticketsSold: 1,
        },
      ])
      .returning({ id: raffles.id })

    await seedPurchaseWithTicket({
      raffleId: raffleA!.id,
      raffleName: "TEST-LookupRaffleA",
      customerName: "Cliente A",
      ticketNumber: 42,
    })
    await seedPurchaseWithTicket({
      raffleId: raffleB!.id,
      raffleName: "TEST-LookupRaffleB",
      customerName: "Cliente B",
      ticketNumber: 42,
    })

    const scoped = await lookupAdminTicketByNumber("0042", raffleA!.id)
    const all = await lookupAdminTicketByNumber("0042")

    expect(scoped).toHaveLength(1)
    expect(scoped[0]?.raffle_id).toBe(raffleA!.id)
    expect(scoped[0]?.customer_name).toBe("Cliente A")
    expect(scoped[0]?.customer_location).toBe("Caracas")
    expect(all).toHaveLength(2)
  })
})

describe("admin purchases ticket search", () => {
  beforeAll(async () => {
    await setupIsolatedTestDatabase()
  })

  it("finds purchases by ticket number in searchType=all", async () => {
    const db = getDb()
    const [raffle] = await db
      .insert(raffles)
      .values({
        name: "TEST-PurchaseTicketSearch",
        totalTickets: 10,
        priceBsCents: 1000,
        priceUsdCents: 100,
        minPurchase: 1,
        maxPurchase: 5,
        status: "active",
        ticketsAvailable: 9,
        ticketsReserved: 0,
        ticketsSold: 1,
      })
      .returning({ id: raffles.id })

    const purchaseId = await seedPurchaseWithTicket({
      raffleId: raffle!.id,
      raffleName: "TEST-PurchaseTicketSearch",
      customerName: "Ticket Search Buyer",
      ticketNumber: 77,
    })

    const result = await listAdminPurchases({
      limit: 50,
      search: "0077",
      searchType: "all",
      status: "all",
      paymentMethod: "all",
      sort: "newest",
    })

    expect(result.data.some((row) => row.id === purchaseId)).toBe(true)
  })
})
