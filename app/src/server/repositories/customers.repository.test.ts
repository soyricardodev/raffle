import { customers } from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import { findOrCreateCustomer } from "./customers.repository"

const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)("customers.repository", () => {
  const createdIds: number[] = []

  beforeAll(async () => {
    await setupIsolatedTestDatabase()
  })

  afterAll(async () => {
    const db = getDb()
    for (const id of createdIds) {
      await db.delete(customers).where(eq(customers.id, id))
    }
  })

  async function createInTx(input: Parameters<typeof findOrCreateCustomer>[1]) {
    const db = getDb()
    const result = await db.transaction((tx) => findOrCreateCustomer(tx, input))
    createdIds.push(result.customerId)
    return result
  }

  const base = {
    customerName: "Test Buyer",
    customerEmail: "buyer@test.local",
    customerLocation: "Venezuela, Carabobo, Valencia",
    locationType: "venezuela",
    venezuelaState: "Carabobo",
    venezuelaMunicipality: "Valencia",
  }

  it("reuses the same row when phone and CI match", async () => {
    const first = await createInTx({
      ...base,
      customerPhone: "04121234567",
      customerCi: "V12345678",
    })
    const second = await createInTx({
      ...base,
      customerName: "Test Buyer Updated",
      customerPhone: "04121234567",
      customerCi: "V12345678",
      customerEmail: "new@test.local",
    })
    expect(second.customerId).toBe(first.customerId)
    expect(first.isReturningCustomer).toBe(false)
    expect(second.isReturningCustomer).toBe(true)

    const db = getDb()
    const [row] = await db
      .select({
        venezuelaMunicipality: customers.venezuelaMunicipality,
        customerLocation: customers.customerLocation,
      })
      .from(customers)
      .where(eq(customers.id, second.customerId))
      .limit(1)
    expect(row?.venezuelaMunicipality).toBe("Valencia")
    expect(row?.customerLocation).toBe("Venezuela, Carabobo, Valencia")
  })

  it("creates separate rows for same phone with different CI", async () => {
    const first = await createInTx({
      ...base,
      customerPhone: "04141234567",
      customerCi: "V11111111",
    })
    const second = await createInTx({
      ...base,
      customerPhone: "04141234567",
      customerCi: "V22222222",
    })
    expect(second.customerId).not.toBe(first.customerId)
  })

  it("creates separate rows for same CI with different phone", async () => {
    const first = await createInTx({
      ...base,
      customerPhone: "04161234567",
      customerCi: "E33333333",
    })
    const second = await createInTx({
      ...base,
      customerPhone: "04241234567",
      customerCi: "E33333333",
    })
    expect(second.customerId).not.toBe(first.customerId)
  })
})
