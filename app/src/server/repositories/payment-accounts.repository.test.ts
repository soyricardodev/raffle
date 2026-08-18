import { paymentAccounts, rafflePaymentMethods, raffles } from "@raffle/shared/db"
import { ValidationError } from "@raffle/shared/errors"
import { eq } from "drizzle-orm"
import { beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { reorderPaymentAccounts as reorderPaymentAccountsService } from "@/server/payment-accounts.service"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import {
  insertPaymentAccount,
  listPaymentAccounts,
  reorderPaymentAccounts,
} from "./payment-accounts.repository"
import { listPaymentMethodsByRaffle } from "./raffle-payment-methods.repository"

describe("payment account sort order", () => {
  beforeAll(async () => {
    await setupIsolatedTestDatabase()
  })

  it("appends new accounts, then reorders so raffle listings follow catalog order", async () => {
    const zelleId = await insertPaymentAccount({
      label: "Zelle first",
      methodType: "zelle",
      accountInfo: { email: "zelle@test.local" },
    })
    const pagoId = await insertPaymentAccount({
      label: "Pago móvil second",
      methodType: "pago_movil",
      accountInfo: {
        bank: "BDV",
        phone: "04120000000",
        cedula_type: "V",
        cedula_number: "12345678",
      },
    })

    const created = await listPaymentAccounts()
    expect(created.map((account) => account.id)).toEqual([zelleId, pagoId])
    expect(created.map((account) => account.sort_order)).toEqual([0, 1])

    await reorderPaymentAccounts([pagoId, zelleId])
    expect((await listPaymentAccounts()).map((account) => account.method_type)).toEqual([
      "pago_movil",
      "zelle",
    ])

    const db = getDb()
    const [raffle] = await db
      .insert(raffles)
      .values({
        name: "TEST-Payment-Order",
        description: "Orden de métodos",
        totalTickets: 10,
        priceBsCents: 500,
        priceUsdCents: 100,
        minPurchase: 1,
        maxPurchase: 5,
        status: "active",
        ticketsAvailable: 10,
        ticketsReserved: 0,
        ticketsSold: 0,
      })
      .returning({ id: raffles.id })

    const raffleId = raffle?.id
    expect(raffleId).toEqual(expect.any(Number))
    if (raffleId == null) return

    await db.insert(rafflePaymentMethods).values([
      { raffleId, accountId: zelleId, isActive: true },
      { raffleId, accountId: pagoId, isActive: true },
    ])

    const methods = await listPaymentMethodsByRaffle(raffleId)
    expect(methods.map((method) => method.method_type)).toEqual(["pago_movil", "zelle"])

    await expect(reorderPaymentAccountsService({ ordered_ids: [pagoId] })).rejects.toBeInstanceOf(
      ValidationError,
    )

    await db.delete(rafflePaymentMethods).where(eq(rafflePaymentMethods.raffleId, raffleId))
    await db.delete(raffles).where(eq(raffles.id, raffleId))
    await db.delete(paymentAccounts)
  })
})
