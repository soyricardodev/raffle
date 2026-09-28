import { createHash, randomBytes, randomUUID } from "node:crypto"
import {
  accounts,
  auditEvents,
  raffles,
  sessions,
  staffActivityDays,
  staffGrants,
  staffInvitations,
  staffRoles,
  users,
} from "@raffle/shared/db"
import { AppError } from "@raffle/shared/errors"
import { hashPassword } from "better-auth/crypto"
import { and, desc, eq, gt, inArray, like, ne, or, sql } from "drizzle-orm"
import { getDb, withImmediateTransaction } from "@/lib/db.server"
import { getEnv } from "@/lib/env"
import { PERMISSION_SET, type Permission, permissionAllowedForRole } from "@/lib/workforce-policy"

const badInput = (message: string) => new AppError(message, 400, "WORKFORCE_INVALID_INPUT")
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")
const now = () => new Date()

function validatedPermission(permission: string): Permission {
  if (!PERMISSION_SET.has(permission)) throw badInput("Permiso desconocido")
  return permission as Permission
}

function validatedGrants(input: { permission: string; raffleId: number | null }[]) {
  if (input.length > 100) throw badInput("Demasiados permisos adicionales")
  const grants = input.map((grant) => ({
    permission: validatedPermission(grant.permission),
    raffleId: grant.raffleId,
  }))
  if (
    grants.some(
      (grant) =>
        grant.raffleId !== null && (!Number.isSafeInteger(grant.raffleId) || grant.raffleId <= 0),
    )
  ) {
    throw badInput("Rifa inválida")
  }
  return [
    ...new Map(
      grants.map((grant) => [`${grant.permission}:${grant.raffleId ?? "all"}`, grant]),
    ).values(),
  ]
}

function assertRolePermissions(role: string, permissions: readonly { permission: string }[]) {
  if (permissions.some((grant) => !permissionAllowedForRole(role, grant.permission)))
    throw badInput("El operador de compras solo puede recibir permisos de compras")
}

export function validatePermissions(permissions: string[]): Permission[] {
  const unique = [...new Set(permissions)]
  if (unique.some((permission) => !PERMISSION_SET.has(permission)))
    throw badInput("Permiso desconocido")
  return unique as Permission[]
}

export async function listWorkforce() {
  const db = getDb()
  const [people, roles, grants, activeSessions, raffleOptions] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.displayName,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(ne(users.role, "customer"))
      .orderBy(users.displayName),
    db.select().from(staffRoles).orderBy(staffRoles.name),
    db.select().from(staffGrants),
    db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        userAgent: sessions.userAgent,
        ipAddress: sessions.ipAddress,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        lastSeenAt: sessions.lastSeenAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(gt(sessions.expiresAt, now()))
      .orderBy(desc(sessions.createdAt)),
    db.select({ id: raffles.id, name: raffles.name }).from(raffles).orderBy(raffles.name),
  ])
  return {
    people: people.map((person) => ({
      ...person,
      grants: grants.filter((g) => g.userId === person.id),
      sessions: activeSessions.filter((s) => s.userId === person.id),
    })),
    roles: roles.map((role) => ({
      ...role,
      permissions: JSON.parse(role.permissions) as Permission[],
    })),
    raffles: raffleOptions,
  }
}

export async function createStaffRole(
  input: { name: string; permissions: string[] },
  actorId: string,
) {
  const name = input.name.trim()
  if (name.length < 3 || name.length > 60)
    throw badInput("El nombre del rol debe tener entre 3 y 60 caracteres")
  const id = randomUUID()
  await withImmediateTransaction(async (tx) => {
    await tx
      .insert(staffRoles)
      .values({ id, name, permissions: JSON.stringify(validatePermissions(input.permissions)) })
    await tx.insert(auditEvents).values({
      actorUserId: actorId,
      action: "workforce.role_created",
      payload: JSON.stringify({ roleId: id }),
    })
  })
  return { id }
}

export async function updateStaffRole(
  id: string,
  input: { name: string; permissions: string[] },
  actorId: string,
) {
  if (input.name.trim().length < 3) throw badInput("Nombre de rol inválido")
  const permissions = validatePermissions(input.permissions)
  assertRolePermissions(
    id,
    permissions.map((permission) => ({ permission })),
  )
  await withImmediateTransaction(async (tx) => {
    const changed = await tx
      .update(staffRoles)
      .set({
        name: input.name.trim(),
        permissions: JSON.stringify(permissions),
      })
      .where(eq(staffRoles.id, id))
      .returning({ id: staffRoles.id })
    if (!changed.length) throw new AppError("Rol no encontrado", 404, "ROLE_NOT_FOUND")
    await tx.insert(auditEvents).values({
      actorUserId: actorId,
      action: "workforce.role_updated",
      payload: JSON.stringify({ roleId: id }),
    })
  })
}

export async function inviteWorker(
  input: {
    name: string
    email: string
    role: string
    grants: { permission: string; raffleId: number | null }[]
  },
  actorId: string,
) {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (name.length < 2 || name.length > 100 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    throw badInput("Nombre o correo inválido")
  const grants = validatedGrants(input.grants)
  assertRolePermissions(input.role, grants)
  const token = randomBytes(32).toString("base64url")
  const userId = randomUUID()
  const inviteId = randomUUID()
  await withImmediateTransaction(async (tx) => {
    const [role] = await tx
      .select({ id: staffRoles.id })
      .from(staffRoles)
      .where(eq(staffRoles.id, input.role))
      .limit(1)
    if (!role) throw badInput("Selecciona un rol existente")
    const [duplicate] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    if (duplicate) throw new AppError("Este correo ya tiene una cuenta", 409, "EMAIL_EXISTS")
    await tx.insert(users).values({
      id: userId,
      username: email,
      displayName: name,
      email,
      emailVerified: true,
      role: role.id,
      status: "invited",
    })
    if (grants.length)
      await tx
        .insert(staffGrants)
        .values(grants.map((grant) => ({ id: randomUUID(), userId, ...grant })))
    await tx.insert(staffInvitations).values({
      id: inviteId,
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 7 * 86400_000),
      createdBy: actorId,
    })
    await tx.insert(auditEvents).values({
      actorUserId: actorId,
      action: "workforce.invited",
      payload: JSON.stringify({ targetUserId: userId }),
    })
  })
  return {
    id: userId,
    invitationUrl: `${getEnv().APP_URL.replace(/\/$/, "")}/invite#token=${token}`,
  }
}

export async function inspectInvitation(token: string) {
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token))
    throw new AppError("Invitación inválida", 404, "INVITATION_INVALID")
  const [row] = await getDb()
    .select({
      name: users.displayName,
      email: users.email,
      status: users.status,
      expiresAt: staffInvitations.expiresAt,
      acceptedAt: staffInvitations.acceptedAt,
    })
    .from(staffInvitations)
    .innerJoin(users, eq(users.id, staffInvitations.userId))
    .where(eq(staffInvitations.tokenHash, hashToken(token)))
    .limit(1)
  if (!row || row.status !== "invited" || row.acceptedAt || row.expiresAt <= now())
    throw new AppError("La invitación caducó o ya fue utilizada", 410, "INVITATION_EXPIRED")
  return { name: row.name, email: row.email }
}

export async function acceptInvitation(token: string, password: string) {
  if (password.length < 12 || password.length > 128)
    throw badInput("La contraseña debe tener entre 12 y 128 caracteres")
  await inspectInvitation(token)
  const passwordHash = await hashPassword(password)
  await withImmediateTransaction(async (tx) => {
    const [invite] = await tx
      .select({
        id: staffInvitations.id,
        userId: staffInvitations.userId,
        expiresAt: staffInvitations.expiresAt,
        acceptedAt: staffInvitations.acceptedAt,
        status: users.status,
      })
      .from(staffInvitations)
      .innerJoin(users, eq(users.id, staffInvitations.userId))
      .where(eq(staffInvitations.tokenHash, hashToken(token)))
      .limit(1)
    if (!invite || invite.acceptedAt || invite.expiresAt <= now() || invite.status !== "invited")
      throw new AppError("La invitación caducó o ya fue utilizada", 410, "INVITATION_EXPIRED")
    await tx.insert(accounts).values({
      id: randomUUID(),
      userId: invite.userId,
      accountId: invite.userId,
      providerId: "credential",
      password: passwordHash,
    })
    await tx
      .update(users)
      .set({ status: "active", updatedAt: now() })
      .where(eq(users.id, invite.userId))
    await tx
      .update(staffInvitations)
      .set({ acceptedAt: now() })
      .where(eq(staffInvitations.id, invite.id))
    await tx
      .insert(auditEvents)
      .values({ actorUserId: invite.userId, action: "workforce.invitation_accepted" })
  })
}

export async function updateWorker(
  id: string,
  input: {
    role: string
    status: "active" | "disabled" | "invited"
    grants: { permission: string; raffleId: number | null }[]
  },
  actorId: string,
) {
  if (id === actorId) throw badInput("No puedes cambiar tu propio acceso")
  const permissions = validatedGrants(input.grants)
  assertRolePermissions(input.role, permissions)
  await withImmediateTransaction(async (tx) => {
    const [target] = await tx
      .select({ id: users.id, role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    if (!target) throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND")
    if (target.role === "super_admin")
      throw new AppError("No se puede modificar al propietario", 403, "OWNER_PROTECTED")
    if (target.status === "invited" && input.status === "active")
      throw badInput("La persona debe aceptar su invitación primero")
    if (target.status !== "invited" && input.status === "invited")
      throw badInput("No se puede volver al estado invitado")
    const [role] = await tx
      .select({ id: staffRoles.id })
      .from(staffRoles)
      .where(eq(staffRoles.id, input.role))
      .limit(1)
    if (!role) throw badInput("Rol inválido")
    await tx
      .update(users)
      .set({ role: role.id, status: input.status, updatedAt: now() })
      .where(eq(users.id, id))
    await tx.delete(staffGrants).where(eq(staffGrants.userId, id))
    if (permissions.length)
      await tx
        .insert(staffGrants)
        .values(permissions.map((grant) => ({ id: randomUUID(), userId: id, ...grant })))
    if (input.status === "disabled" || target.role !== role.id)
      await tx.delete(sessions).where(eq(sessions.userId, id))
    await tx.insert(auditEvents).values({
      actorUserId: actorId,
      action: input.status === "disabled" ? "workforce.disabled" : "workforce.access_updated",
      payload: JSON.stringify({ targetUserId: id }),
    })
  })
}

export async function renewInvitation(userId: string, actorId: string) {
  const token = randomBytes(32).toString("base64url")
  await withImmediateTransaction(async (tx) => {
    const [user] = await tx
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!user || user.status !== "invited")
      throw badInput("Solo se puede renovar una invitación pendiente")
    await tx.delete(staffInvitations).where(eq(staffInvitations.userId, userId))
    await tx.insert(staffInvitations).values({
      id: randomUUID(),
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 7 * 86400_000),
      createdBy: actorId,
    })
    await tx.insert(auditEvents).values({
      actorUserId: actorId,
      action: "workforce.invitation_renewed",
      payload: JSON.stringify({ targetUserId: userId }),
    })
  })
  return { invitationUrl: `${getEnv().APP_URL.replace(/\/$/, "")}/invite#token=${token}` }
}

export async function revokeStaffSession(sessionId: string, actorId: string) {
  await withImmediateTransaction(async (tx) => {
    const [row] = await tx
      .select({ userId: sessions.userId, role: users.role })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.id, sessionId))
      .limit(1)
    if (!row) throw new AppError("Sesión no encontrada", 404, "SESSION_NOT_FOUND")
    if (row.role === "super_admin" && row.userId !== actorId) {
      const [actor] = await tx
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, actorId))
        .limit(1)
      if (actor?.role !== "super_admin")
        throw new AppError("Solo el propietario puede cerrar esta sesión", 403, "OWNER_PROTECTED")
    }
    await tx.delete(sessions).where(eq(sessions.id, sessionId))
    await tx.insert(auditEvents).values({
      actorUserId: actorId,
      action: "workforce.session_revoked",
      payload: JSON.stringify({ targetUserId: row.userId }),
    })
  })
}

export async function heartbeat(userId: string, sessionId: string) {
  const timestamp = now()
  await withImmediateTransaction(async (tx) => {
    const [session] = await tx
      .select({ lastSeenAt: sessions.lastSeenAt })
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, userId),
          gt(sessions.expiresAt, timestamp),
        ),
      )
      .limit(1)
    if (!session) return
    const elapsed = session.lastSeenAt
      ? Math.floor((timestamp.getTime() - session.lastSeenAt.getTime()) / 1000)
      : 0
    const seconds = elapsed > 0 && elapsed <= 90 ? elapsed : 0
    await tx.update(sessions).set({ lastSeenAt: timestamp }).where(eq(sessions.id, sessionId))
    if (seconds > 0) {
      const day = timestamp.toISOString().slice(0, 10)
      await tx
        .insert(staffActivityDays)
        .values({ userId, day, activeSeconds: seconds })
        .onConflictDoUpdate({
          target: [staffActivityDays.userId, staffActivityDays.day],
          set: { activeSeconds: sql`${staffActivityDays.activeSeconds} + ${seconds}` },
        })
    }
  })
}

export async function workforcePerformance(raffleIds: number[], days = 30) {
  const safeDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 365) : 30
  const since = new Date(Date.now() - safeDays * 86400_000)
  const db = getDb()
  const events = await db
    .select({
      actorUserId: auditEvents.actorUserId,
      action: auditEvents.action,
      raffleId: auditEvents.raffleId,
      createdAt: auditEvents.createdAt,
      payload: auditEvents.payload,
    })
    .from(auditEvents)
    .where(
      and(
        gt(auditEvents.createdAt, since),
        or(like(auditEvents.action, "purchases.%"), eq(auditEvents.action, "admin.http_mutation")),
        raffleIds.length ? inArray(auditEvents.raffleId, raffleIds) : undefined,
      ),
    )
  const activity = await db
    .select()
    .from(staffActivityDays)
    .where(gt(staffActivityDays.day, since.toISOString().slice(0, 10)))
    .orderBy(staffActivityDays.day)
  const people = await db
    .select({ id: users.id, name: users.displayName, role: users.role })
    .from(users)
    .where(ne(users.role, "customer"))
  return people
    .map((person) => {
      const own = events.filter(
        (e) =>
          e.actorUserId === person.id &&
          (e.action.startsWith("purchases.") || e.action === "admin.http_mutation") &&
          (!raffleIds.length || (e.raffleId !== null && raffleIds.includes(e.raffleId))),
      )
      const days = activity.filter((a) => a.userId === person.id)
      const byAction = Object.fromEntries(
        [...new Set(own.map((e) => e.action))].map((action) => [
          action,
          own.filter((e) => e.action === action).length,
        ]),
      )
      const activeSeconds = days.reduce((sum, d) => sum + d.activeSeconds, 0)
      const ticketQuantity = (action: string) =>
        own
          .filter((e) => e.action === action)
          .reduce((sum, e) => {
            try {
              const value = JSON.parse(e.payload ?? "{}") as { quantity?: number }
              return (
                sum +
                (typeof value.quantity === "number" && Number.isFinite(value.quantity)
                  ? value.quantity
                  : 0)
              )
            } catch {
              return sum
            }
          }, 0)
      return {
        id: person.id,
        name: person.name,
        role: person.role,
        totalActions: own.length,
        approved: byAction["purchases.approved"] ?? 0,
        rejected: byAction["purchases.rejected"] ?? 0,
        reversed: byAction["purchases.reversed"] ?? 0,
        ticketsAdded: ticketQuantity("purchases.tickets_added"),
        ticketsRemoved: ticketQuantity("purchases.tickets_removed"),
        byAction,
        activeSeconds,
        activeDays: days.length,
        averageDailyHours: days.length ? Math.round(activeSeconds / days.length / 36) / 100 : 0,
        dailyActivity: days,
      }
    })
    .sort((a, b) => b.totalActions - a.totalActions)
}
