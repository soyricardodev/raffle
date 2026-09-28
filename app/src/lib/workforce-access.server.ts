import { purchases, staffGrants, staffRoles } from "@raffle/shared/db"
import { ForbiddenError } from "@raffle/shared/errors"
import { and, eq, isNull } from "drizzle-orm"
import { getDb } from "./db.server"
import {
  hasGrant,
  PERMISSION_SET,
  PERMISSIONS,
  type Permission,
  permissionAllowedForRole,
} from "./workforce-policy"

/** Only global grants can open a module whose list is not raffle-scoped. */
export async function navigationPermissionsForUser(user: {
  id: string | number
  role?: string | null
}): Promise<Permission[]> {
  if (user.role === "super_admin") return [...PERMISSIONS]
  if (user.role === "admin") return PERMISSIONS.filter((p) => p !== "workforce.manage")
  const [template] = await getDb()
    .select({ permissions: staffRoles.permissions })
    .from(staffRoles)
    .where(eq(staffRoles.id, user.role ?? ""))
    .limit(1)
  const grants = await getDb()
    .select({ permission: staffGrants.permission })
    .from(staffGrants)
    .where(and(eq(staffGrants.userId, String(user.id)), isNull(staffGrants.raffleId)))
  return [
    ...new Set(
      [
        ...(template ? (JSON.parse(template.permissions) as string[]) : []),
        ...grants.map((g) => g.permission),
      ].filter(
        (permission): permission is Permission =>
          PERMISSION_SET.has(permission) && permissionAllowedForRole(user.role, permission),
      ),
    ),
  ]
}

export async function assertPermission(
  user: { id: string | number; role?: string | null },
  permission: Permission,
  raffleId?: number | null,
): Promise<void> {
  const role = user.role ?? ""
  if (role === "super_admin" || (role === "admin" && permission !== "workforce.manage")) return
  const [template] = await getDb()
    .select({ permissions: staffRoles.permissions })
    .from(staffRoles)
    .where(eq(staffRoles.id, role))
    .limit(1)
  const rolePermissions = template ? (JSON.parse(template.permissions) as string[]) : []
  const grants = await getDb()
    .select({ permission: staffGrants.permission, raffleId: staffGrants.raffleId })
    .from(staffGrants)
    .where(eq(staffGrants.userId, String(user.id)))
  if (!hasGrant({ role, rolePermissions, grants, permission, raffleId }))
    throw new ForbiddenError([permission])
}

/** Effective ticket permissions for one purchase, including raffle-scoped grants. */
export async function purchaseTicketPermissionsForUser(
  user: { id: string | number; role?: string | null },
  raffleId: number,
) {
  const permissions = [
    "purchases.tickets.add",
    "purchases.tickets.remove",
    "purchases.tickets.reassign",
  ] as const
  const role = user.role ?? ""
  if (role === "super_admin" || role === "admin") return [...permissions]
  const db = getDb()
  const [template] = await db
    .select({ permissions: staffRoles.permissions })
    .from(staffRoles)
    .where(eq(staffRoles.id, role))
    .limit(1)
  const grants = await db
    .select({ permission: staffGrants.permission, raffleId: staffGrants.raffleId })
    .from(staffGrants)
    .where(eq(staffGrants.userId, String(user.id)))
  const rolePermissions = template ? (JSON.parse(template.permissions) as string[]) : []
  return permissions.filter((permission) =>
    hasGrant({ role, rolePermissions, grants, permission, raffleId }),
  )
}

export async function raffleIdForAdminPath(pathname: string): Promise<number | undefined> {
  const purchaseMatch = /^\/api\/admin\/purchases\/(\d+)(?:\/|$)/.exec(pathname)
  if (purchaseMatch) {
    const [row] = await getDb()
      .select({ raffleId: purchases.raffleId })
      .from(purchases)
      .where(eq(purchases.id, Number(purchaseMatch[1])))
      .limit(1)
    return row?.raffleId
  }
  const raffleMatch = /^\/api\/admin\/raffles\/(\d+)(?:\/|$)/.exec(pathname)
  return raffleMatch ? Number(raffleMatch[1]) : undefined
}
