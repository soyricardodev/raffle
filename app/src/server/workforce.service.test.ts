import {
  accounts,
  auditEvents,
  raffles,
  sessions,
  staffGrants,
  staffRoles,
  users,
} from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import { beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import {
  assertPermission,
  navigationPermissionsForUser,
  purchaseTicketPermissionsForUser,
} from "@/lib/workforce-access.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import {
  acceptInvitation,
  createStaffRole,
  heartbeat,
  inspectInvitation,
  inviteWorker,
  listWorkforce,
  updateStaffRole,
  updateWorker,
  workforcePerformance,
} from "./workforce.service"

describe("workforce lifecycle", () => {
  beforeAll(setupIsolatedTestDatabase)
  it("keeps operator navigation purchase-only despite stale broad role and grant data", async () => {
    const db = getDb()
    await db.insert(staffRoles).values({
      id: "operator",
      name: "Operador de compras",
      permissions: JSON.stringify(["dashboard.read", "purchases.read"]),
    })
    await db.insert(users).values({
      id: "test-operator",
      username: "Test Operator",
      email: "operator@example.test",
      role: "operator",
    })
    await db.insert(staffGrants).values({
      id: "operator-extra-grant",
      userId: "test-operator",
      permission: "settings.read",
      raffleId: null,
    })
    const operator = { id: "test-operator", role: "operator" }
    expect(await navigationPermissionsForUser(operator)).toEqual(["purchases.read"])
    await expect(assertPermission(operator, "dashboard.read")).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    await expect(assertPermission(operator, "settings.read")).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    await expect(assertPermission(operator, "purchases.read")).resolves.toBeUndefined()
    await expect(
      updateStaffRole(
        "operator",
        { name: "Operador de compras", permissions: ["raffles.read"] },
        "test-admin",
      ),
    ).rejects.toMatchObject({ code: "WORKFORCE_INVALID_INPUT" })
  })
  it("honors a ticket-add grant only for its assigned raffle", async () => {
    const db = getDb()
    const raffleIds = await db
      .insert(raffles)
      .values(
        ["Allowed", "Other"].map((name) => ({
          name: `TEST-${name}-TicketGrant`,
          description: "Scoped ticket permission test",
          totalTickets: 10,
          priceBsCents: 1000,
          priceUsdCents: 100,
          minPurchase: 1,
          maxPurchase: 5,
          drawDate: new Date(Date.now() + 86400_000),
          status: "active" as const,
          autoPauseEnabled: false,
          ticketsAvailable: 10,
          ticketsReserved: 0,
          ticketsSold: 0,
        })),
      )
      .returning({ id: raffles.id })
    const [allowedRaffle, otherRaffle] = raffleIds
    if (!allowedRaffle || !otherRaffle) throw new Error("Test raffles were not created")
    const allowedRaffleId = allowedRaffle.id
    const otherRaffleId = otherRaffle.id
    await db.insert(staffRoles).values({
      id: "ticket-operator",
      name: "Ticket operator",
      permissions: JSON.stringify(["purchases.read"]),
    })
    await db.insert(users).values({
      id: "ticket-operator-user",
      username: "Ticket Operator",
      email: "ticket-operator@example.test",
      role: "ticket-operator",
    })
    await db.insert(staffGrants).values({
      id: "ticket-add-grant",
      userId: "ticket-operator-user",
      permission: "purchases.tickets.add",
      raffleId: allowedRaffleId,
    })
    const user = { id: "ticket-operator-user", role: "ticket-operator" }
    expect(await purchaseTicketPermissionsForUser(user, allowedRaffleId)).toEqual([
      "purchases.tickets.add",
    ])
    expect(await purchaseTicketPermissionsForUser(user, otherRaffleId)).toEqual([])
    await expect(
      assertPermission(user, "purchases.tickets.add", allowedRaffleId),
    ).resolves.toBeUndefined()
    await expect(
      assertPermission(user, "purchases.tickets.add", otherRaffleId),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
  })
  it("enforces one-use invitation and revokes disabled worker sessions", async () => {
    const db = getDb()
    const { id: role } = await createStaffRole(
      { name: "Verifier", permissions: ["purchases.read"] },
      "test-admin",
    )
    const invited = await inviteWorker(
      {
        name: "Ana López",
        email: "ana@example.test",
        role,
        grants: [{ permission: "purchases.approve", raffleId: null }],
      },
      "test-admin",
    )
    const sameName = await inviteWorker(
      { name: "Ana López", email: "ana.other@example.test", role, grants: [] },
      "test-admin",
    )
    expect(sameName.id).not.toBe(invited.id)
    const token = new URL(invited.invitationUrl).hash.slice("#token=".length)
    const testPassword = ["a", "strong", "passphrase", "123"].join("-")
    expect(await inspectInvitation(token)).toEqual({ name: "Ana López", email: "ana@example.test" })
    expect((await db.select().from(accounts).where(eq(accounts.userId, invited.id))).length).toBe(0)
    await acceptInvitation(token, testPassword)
    expect((await db.select().from(users).where(eq(users.id, invited.id)))[0]?.status).toBe(
      "active",
    )
    expect((await db.select().from(accounts).where(eq(accounts.userId, invited.id))).length).toBe(1)
    await expect(acceptInvitation(token, testPassword)).rejects.toMatchObject({
      code: "INVITATION_EXPIRED",
    })
    const sessionId = "ana-session"
    await db.insert(sessions).values({
      id: sessionId,
      userId: invited.id,
      token: "ana-session-token",
      expiresAt: new Date(Date.now() + 86400_000),
    })
    await heartbeat(invited.id, sessionId)
    await updateWorker(invited.id, { role, status: "disabled", grants: [] }, "test-admin")
    expect((await db.select().from(sessions).where(eq(sessions.userId, invited.id))).length).toBe(0)
    expect((await db.select().from(users).where(eq(users.id, invited.id)))[0]?.status).toBe(
      "disabled",
    )
    const events = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.actorUserId, "test-admin"))
    expect(events.map((event) => event.action)).toContain("workforce.disabled")
  })
  it("counts named actions in the ranking", async () => {
    const db = getDb()
    await db.insert(users).values({
      id: "test-customer",
      username: "Buyer",
      email: "buyer@example.test",
      role: "customer",
    })
    await db
      .insert(auditEvents)
      .values({ actorUserId: "test-admin", action: "purchases.approved", raffleId: null })
    const scores = await workforcePerformance([])
    expect(scores.find((score) => score.id === "test-admin")?.approved).toBe(1)
    expect(scores.some((score) => score.id === "test-customer")).toBe(false)
    const workforce = await listWorkforce()
    const people = workforce.people
    expect(people.length).toBeGreaterThan(1)
    expect(people.some((person) => person.id === "test-customer")).toBe(false)
    expect(Array.isArray(workforce.raffles)).toBe(true)
  })
})
