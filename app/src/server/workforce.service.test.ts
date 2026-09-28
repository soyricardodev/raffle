import { accounts, auditEvents, sessions, users } from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import { beforeAll, describe, expect, it } from "vitest"
import { getDb } from "@/lib/db.server"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import {
  acceptInvitation,
  createStaffRole,
  heartbeat,
  inspectInvitation,
  inviteWorker,
  listWorkforce,
  updateWorker,
  workforcePerformance,
} from "./workforce.service"

describe("workforce lifecycle", () => {
  beforeAll(setupIsolatedTestDatabase)
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
