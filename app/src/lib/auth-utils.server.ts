import { users } from "@raffle/shared/db"
import { ForbiddenError, UnauthorizedError } from "@raffle/shared/errors"
import type { UserRole } from "@raffle/shared/validators"
import { eq } from "drizzle-orm"
import { getAuth } from "./auth.server"
import { getDb } from "./db.server"
import { getLogger } from "./logger"
import { assertSameOriginMutation } from "./origin-guard.server"
import { assertPermission, raffleIdForAdminPath } from "./workforce-access.server"
import { type Permission, permissionForAdminRequest } from "./workforce-policy"

const logger = getLogger()

export async function getSession(request: Request) {
  return getAuth().api.getSession({ headers: request.headers })
}

/**
 * Usuario con campos de nuestra tabla `users`, extendiendo el tipo de Better Auth.
 * Better Auth usa `id: string` (UUID), pero nuestra tabla legacy usa `id: number`.
 */
interface AppUser {
  id: string | number
  username?: string | null
  email: string
  role?: string | null
}

/** Obtiene el usuario autenticado o lanza UnauthorizedError */
export async function requireAuth(request: Request): Promise<AppUser> {
  const session = await getSession(request)
  if (!session?.user) {
    throw new UnauthorizedError()
  }
  const [current] = await getDb()
    .select({ status: users.status, role: users.role })
    .from(users)
    .where(eq(users.id, String(session.user.id)))
    .limit(1)
  if (!current || current.status !== "active") throw new UnauthorizedError()
  return { ...(session.user as unknown as AppUser), role: current.role }
}

/** Verifica que el usuario autenticado tenga al menos uno de los roles requeridos */
export async function requireRole(request: Request, ...roles: (UserRole | UserRole[])[]) {
  const flatRoles = roles.flat()
  const user = await requireAuth(request)

  const userRole = user.role as UserRole | null | undefined
  if (!userRole) {
    logger.warn({ userId: user.id, requiredRoles: flatRoles }, "auth:missing_role")
    throw new ForbiddenError(flatRoles)
  }

  if (!flatRoles.includes(userRole)) {
    logger.warn({ userId: user.id, userRole, requiredRoles: flatRoles }, "auth:forbidden")
    throw new ForbiddenError(flatRoles)
  }

  return user
}

/** Shortcut: solo admin o super_admin */
export async function requireAdmin(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") assertSameOriginMutation(request)
  const user = await requireAuth(request)
  const path = new URL(request.url).pathname
  const permission = permissionForAdminRequest(request.method, path)
  if (!permission) throw new ForbiddenError()
  await assertPermission(user, permission, await raffleIdForAdminPath(path))
  return user
}

export async function requirePermission(
  request: Request,
  permission: Permission,
  raffleId?: number | null,
) {
  const user = await requireAuth(request)
  await assertPermission(user, permission, raffleId)
  return user
}

/** Admin mutating APIs: session + role + same-origin CSRF check. */
export async function requireAdminMutation(request: Request) {
  assertSameOriginMutation(request)
  return requireAdmin(request)
}

/** Shortcut: solo super_admin */
export async function requireSuperAdmin(request: Request) {
  return requireRole(request, "super_admin")
}
