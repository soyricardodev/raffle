import { ForbiddenError, UnauthorizedError } from "@raffle/shared/errors"
import type { UserRole } from "@raffle/shared/validators"
import { getAuth } from "./auth.server"
import { getLogger } from "./logger"

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
  // Better Auth devuelve un user con campos de nuestra tabla `users`
  return session.user as unknown as AppUser
}

/** Verifica que el usuario autenticado tenga al menos uno de los roles requeridos */
export async function requireRole(request: Request, ...roles: (UserRole | UserRole[])[]) {
  const flatRoles = roles.flat()
  const user = await requireAuth(request)

  const userRole = (user.role || "admin") as UserRole

  if (!flatRoles.includes(userRole)) {
    logger.warn({ userId: user.id, userRole, requiredRoles: flatRoles }, "auth:forbidden")
    throw new ForbiddenError(flatRoles)
  }

  return user
}

/** Shortcut: solo admin o super_admin */
export async function requireAdmin(request: Request) {
  return requireRole(request, "admin", "super_admin")
}

/** Shortcut: solo super_admin */
export async function requireSuperAdmin(request: Request) {
  return requireRole(request, "super_admin")
}
