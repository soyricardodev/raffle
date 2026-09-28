export const PERMISSIONS = [
  "dashboard.read",
  "raffles.read",
  "raffles.create",
  "raffles.edit",
  "raffles.lifecycle",
  "purchases.read",
  "purchases.approve",
  "purchases.reject",
  "purchases.reverse",
  "purchases.tickets.add",
  "purchases.tickets.remove",
  "purchases.tickets.reassign",
  "purchases.customer.edit",
  "payments.read",
  "payments.manage",
  "analytics.read",
  "emails.read",
  "emails.manage",
  "settings.read",
  "settings.manage",
  "push.read",
  "push.manage",
  "workforce.read",
  "workforce.manage",
] as const
export type Permission = (typeof PERMISSIONS)[number]
export const PERMISSION_SET = new Set<string>(PERMISSIONS)

/** The built-in operator is intentionally limited to purchase work. Use a custom role for more. */
export function permissionAllowedForRole(
  role: string | null | undefined,
  permission: string,
): boolean {
  return role !== "operator" || permission.startsWith("purchases.")
}

/** Pure, fail-closed mapping for every administrative HTTP endpoint. */
export function permissionForAdminRequest(method: string, pathname: string): Permission | null {
  const write = method !== "GET" && method !== "HEAD"
  if (pathname === "/api/admin/me/preferences") return "purchases.read"
  if (pathname.startsWith("/api/admin/workforce"))
    return write ? "workforce.manage" : "workforce.read"
  if (pathname.startsWith("/api/admin/dashboard")) return "dashboard.read"
  if (pathname.startsWith("/api/admin/analytics")) return "analytics.read"
  if (pathname.startsWith("/api/admin/purchases") || /^\/api\/admin\/purchases\./.test(pathname)) {
    if (!write) return "purchases.read"
    if (/\/tickets\/add$/.test(pathname)) return "purchases.tickets.add"
    if (/\/tickets\/remove$/.test(pathname)) return "purchases.tickets.remove"
    if (/\/tickets\/reassign$/.test(pathname)) return "purchases.tickets.reassign"
    if (/\/customer$/.test(pathname)) return "purchases.customer.edit"
    if (/\/status$/.test(pathname)) return "purchases.read" // status-specific check after parsing body
    if (/\/emails\/send$/.test(pathname)) return "emails.manage"
    return null
  }
  if (pathname.startsWith("/api/admin/raffles"))
    return write
      ? pathname === "/api/admin/raffles/"
        ? "raffles.create"
        : /\/(pause|unpause|status|lifecycle|auto-pause|publish)$/.test(pathname)
          ? "raffles.lifecycle"
          : "raffles.edit"
      : "raffles.read"
  if (pathname.startsWith("/api/admin/payment-accounts"))
    return write ? "payments.manage" : "payments.read"
  if (pathname.startsWith("/api/admin/emails")) return write ? "emails.manage" : "emails.read"
  if (pathname.startsWith("/api/admin/push")) return write ? "push.manage" : "push.read"
  if (pathname === "/api/admin/upload") return "raffles.edit"
  if (pathname === "/api/admin/config") return write ? "settings.manage" : "settings.read"
  if (pathname === "/api/admin/maintenance") return "settings.manage"
  return null
}

export function hasGrant(input: {
  role: string
  rolePermissions: readonly string[]
  grants: readonly { permission: string; raffleId: number | null }[]
  permission: Permission
  raffleId?: number | null
}): boolean {
  if (input.role === "super_admin") return true
  if (input.role === "admin" && input.permission !== "workforce.manage") return true
  if (!permissionAllowedForRole(input.role, input.permission)) return false
  if (input.rolePermissions.includes(input.permission)) return true
  return input.grants.some(
    (grant) =>
      grant.permission === input.permission &&
      (grant.raffleId === null || grant.raffleId === input.raffleId),
  )
}
