import { purchases, staffGrants, staffRoles } from "@raffle/shared/db"
import { ForbiddenError } from "@raffle/shared/errors"
import { eq } from "drizzle-orm"
import { getDb } from "./db.server"
import { hasGrant, type Permission } from "./workforce-policy"

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
