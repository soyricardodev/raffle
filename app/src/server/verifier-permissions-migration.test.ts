import { readFileSync } from "node:fs"
import { staffRoles, users } from "@raffle/shared/db"
import { eq, sql } from "drizzle-orm"
import { beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { assertPermission, purchaseTicketPermissionsForUser } from "@/lib/workforce-access.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"

const migration = readFileSync(
  new URL(
    "../../../packages/shared/drizzle-sqlite/0026_verifier_ticket_permissions.sql",
    import.meta.url,
  ),
  "utf8",
)

describe("verifier ticket permissions migration", () => {
  beforeAll(setupIsolatedTestDatabase)

  it("adds ticket operations to an existing role without dropping customized permissions", async () => {
    const db = getDb()
    await db.insert(staffRoles).values({
      id: "verifier",
      name: "Verificador de pagos",
      permissions: JSON.stringify([
        "purchases.read",
        "purchases.reject",
        "purchases.customer.edit",
      ]),
    })
    await db.insert(users).values({
      id: "existing-verifier",
      username: "Existing verifier",
      email: "existing-verifier@example.test",
      role: "verifier",
    })

    await db.run(sql.raw(migration))
    await db.run(sql.raw(migration))

    const [role] = await db.select().from(staffRoles).where(eq(staffRoles.id, "verifier"))
    const permissions = JSON.parse(role?.permissions ?? "[]") as string[]
    expect(new Set(permissions)).toEqual(
      new Set([
        "purchases.read",
        "purchases.reject",
        "purchases.customer.edit",
        "purchases.approve",
        "purchases.tickets.add",
        "purchases.tickets.remove",
      ]),
    )
    expect(permissions).toHaveLength(6)

    const user = { id: "existing-verifier", role: "verifier" }
    await expect(assertPermission(user, "purchases.approve")).resolves.toBeUndefined()
    await expect(assertPermission(user, "purchases.tickets.add")).resolves.toBeUndefined()
    await expect(assertPermission(user, "purchases.tickets.remove")).resolves.toBeUndefined()
    expect(await purchaseTicketPermissionsForUser(user, 42)).toEqual([
      "purchases.tickets.add",
      "purchases.tickets.remove",
    ])
  })
})
