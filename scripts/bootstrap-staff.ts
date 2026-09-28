/** One-time production bootstrap. Requires explicit secrets; never prints passwords. */
import { randomUUID } from "node:crypto"
import { accounts, sessions, staffRoles, users } from "@raffle/shared/db"
import { hashPassword } from "better-auth/crypto"
import { and, eq } from "drizzle-orm"
import { createScriptDb } from "./lib/db"

async function main() {
  const developerEmail = process.env.BOOTSTRAP_DEVELOPER_EMAIL?.trim().toLowerCase()
  const developerPassword = process.env.BOOTSTRAP_DEVELOPER_PASSWORD
  const ownerEmail = process.env.BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase()
  const ownerPassword = process.env.BOOTSTRAP_OWNER_PASSWORD
  const retiredEmail = process.env.BOOTSTRAP_RETIRED_EMAIL?.trim().toLowerCase()
  if (
    !developerEmail ||
    !ownerEmail ||
    developerEmail === ownerEmail ||
    !developerPassword ||
    !ownerPassword ||
    developerPassword.length < 12 ||
    ownerPassword.length < 12
  )
    throw new Error("Set distinct BOOTSTRAP_*_EMAIL and BOOTSTRAP_*_PASSWORD (12+ chars)")
  const db = createScriptDb()
  const roles = [
    {
      id: "verifier",
      name: "Verificador de pagos",
      permissions: [
        "dashboard.read",
        "raffles.read",
        "purchases.read",
        "purchases.approve",
        "purchases.reject",
        "purchases.tickets.add",
        "purchases.tickets.remove",
      ],
    },
    {
      id: "operator",
      name: "Operador de compras",
      permissions: [
        "purchases.read",
        "purchases.approve",
        "purchases.reject",
        "purchases.reverse",
        "purchases.tickets.add",
        "purchases.tickets.remove",
        "purchases.tickets.reassign",
        "purchases.customer.edit",
      ],
    },
    {
      id: "analyst",
      name: "Analista",
      permissions: ["dashboard.read", "raffles.read", "purchases.read", "analytics.read"],
    },
  ]
  for (const role of roles)
    await db
      .insert(staffRoles)
      .values({ id: role.id, name: role.name, permissions: JSON.stringify(role.permissions) })
      .onConflictDoNothing()
  for (const entry of [
    { email: developerEmail, password: developerPassword, name: "Developer" },
    { email: ownerEmail, password: ownerPassword, name: "Yoiber" },
  ]) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, entry.email))
      .limit(1)
    if (existing) {
      const passwordHash = await hashPassword(entry.password)
      await db
        .update(users)
        .set({ role: "super_admin", status: "active", displayName: entry.name })
        .where(eq(users.id, existing.id))
      const [credential] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.userId, existing.id), eq(accounts.providerId, "credential")))
        .limit(1)
      if (credential)
        await db
          .update(accounts)
          .set({ password: passwordHash })
          .where(eq(accounts.id, credential.id))
      else
        await db.insert(accounts).values({
          id: randomUUID(),
          userId: existing.id,
          accountId: existing.id,
          providerId: "credential",
          password: passwordHash,
        })
      await db.delete(sessions).where(eq(sessions.userId, existing.id))
      process.stdout.write(
        "Updated credentials and revoked sessions for an administrative account\n",
      )
      continue
    }
    const id = randomUUID()
    await db.insert(users).values({
      id,
      username: entry.name,
      displayName: entry.name,
      email: entry.email,
      emailVerified: true,
      role: "super_admin",
      status: "active",
    })
    await db.insert(accounts).values({
      id: randomUUID(),
      userId: id,
      accountId: id,
      providerId: "credential",
      password: await hashPassword(entry.password),
    })
    process.stdout.write("Created an administrative account\n")
  }
  if (retiredEmail) {
    if (retiredEmail === developerEmail || retiredEmail === ownerEmail)
      throw new Error("BOOTSTRAP_RETIRED_EMAIL cannot be a bootstrap account")
    const [retired] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, retiredEmail))
      .limit(1)
    if (!retired) throw new Error("Retired account not found")
    await db.update(users).set({ status: "disabled" }).where(eq(users.id, retired.id))
    await db.delete(sessions).where(eq(sessions.userId, retired.id))
    process.stdout.write("Disabled the old shared account\n")
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
