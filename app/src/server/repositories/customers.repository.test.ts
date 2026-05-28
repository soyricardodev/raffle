import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { eq } from "drizzle-orm"
import { customers } from "@raffle/shared/db"
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
    const id = await db.transaction((tx) => findOrCreateCustomer(tx, input))
    createdIds.push(id)
    return id
  }

  const base = {
    customerName: "Test Buyer",
    customerEmail: "buyer@test.local",
    customerLocation: "Venezuela, Carabobo",
    locationType: "venezuela",
    venezuelaState: "Carabobo",
  }

  it("reuses the same row when phone and CI match", async () => {
    const id1 = await createInTx({
      ...base,
      customerPhone: "04121234567",
      customerCi: "V12345678",
    })
    const id2 = await createInTx({
      ...base,
      customerName: "Test Buyer Updated",
      customerPhone: "04121234567",
      customerCi: "V12345678",
      customerEmail: "new@test.local",
    })
    expect(id2).toBe(id1)
  })

  it("creates separate rows for same phone with different CI", async () => {
    const id1 = await createInTx({
      ...base,
      customerPhone: "04141234567",
      customerCi: "V11111111",
    })
    const id2 = await createInTx({
      ...base,
      customerPhone: "04141234567",
      customerCi: "V22222222",
    })
    expect(id2).not.toBe(id1)
  })

  it("creates separate rows for same CI with different phone", async () => {
    const id1 = await createInTx({
      ...base,
      customerPhone: "04161234567",
      customerCi: "E33333333",
    })
    const id2 = await createInTx({
      ...base,
      customerPhone: "04241234567",
      customerCi: "E33333333",
    })
    expect(id2).not.toBe(id1)
  })
})
