import { normalizePhone, purchases, raffles } from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import { beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import { seedPagoMovilPaymentMethodForRaffle } from "@/test/payment-methods-test-helper"
import { withTestBuyerDefaults } from "@/test/purchase-test-helper"
import { createPurchase, updatePurchaseCustomerContact } from "./purchase.service"

async function seedTestRaffle(name: string) {
  const db = getDb()
  const [raffle] = await db
    .insert(raffles)
    .values({
      name,
      description: "Admin customer contact test",
      totalTickets: 20,
      priceBsCents: 1000,
      priceUsdCents: 100,
      minPurchase: 1,
      maxPurchase: 5,
      drawDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "active",
      autoPauseEnabled: false,
      ticketsAvailable: 20,
      ticketsReserved: 0,
      ticketsSold: 0,
    })
    .returning({ id: raffles.id })
  return raffle!.id
}

describe("admin purchase customer contact update", () => {
  beforeAll(async () => {
    await setupIsolatedTestDatabase()
  })

  it("updates phone and normalized fields for verification lookup", async () => {
    const db = getDb()
    const raffleId = await seedTestRaffle("TEST-AdminCustomerContact")
    const rafflePaymentMethodId = await seedPagoMovilPaymentMethodForRaffle(raffleId)

    const wrongPhone = "04121111111"
    const correctPhone = "04142222222"

    const purchase = await createPurchase(
      withTestBuyerDefaults({
        raffleId,
        customerName: "Typo Buyer",
        customerPhone: wrongPhone,
        customerCi: "V87654321",
        rafflePaymentMethodId,
        paymentReference: "admin-customer-contact-ref",
        ticketQuantity: 1,
      }),
    )

    await updatePurchaseCustomerContact(
      purchase.purchaseId,
      {
        customerName: "Typo Buyer",
        customerPhone: correctPhone,
        customerEmail: "comprador@test.local",
        customerCi: "V87654321",
        customerLocation: "Venezuela, Carabobo, Valencia",
      },
      { adminUserId: "test-admin" },
    )

    const [row] = await db
      .select({
        customerPhone: purchases.customerPhone,
        customerPhoneNormalized: purchases.customerPhoneNormalized,
        customerCi: purchases.customerCi,
      })
      .from(purchases)
      .where(eq(purchases.id, purchase.purchaseId))
      .limit(1)

    expect(row?.customerPhone).toBe(correctPhone)
    expect(row?.customerPhoneNormalized).toBe(normalizePhone(correctPhone))
    expect(row?.customerCi).toBe("V87654321")
  })

  it("updates formatted cédula on the purchase row", async () => {
    const db = getDb()
    const raffleId = await seedTestRaffle("TEST-AdminCustomerCi")
    const rafflePaymentMethodId = await seedPagoMovilPaymentMethodForRaffle(raffleId)

    const purchase = await createPurchase(
      withTestBuyerDefaults({
        raffleId,
        customerName: "CI Typo Buyer",
        customerPhone: "04143333333",
        customerCi: "V11111111",
        rafflePaymentMethodId,
        paymentReference: "admin-customer-ci-ref",
        ticketQuantity: 1,
      }),
    )

    await updatePurchaseCustomerContact(
      purchase.purchaseId,
      {
        customerName: "CI Typo Buyer",
        customerPhone: "04143333333",
        customerEmail: "comprador@test.local",
        customerCi: "v22222222",
        customerLocation: "Venezuela, Carabobo, Valencia",
      },
      { adminUserId: "test-admin" },
    )

    const [row] = await db
      .select({ customerCi: purchases.customerCi })
      .from(purchases)
      .where(eq(purchases.id, purchase.purchaseId))
      .limit(1)

    expect(row?.customerCi).toBe("V22222222")
  })
})
