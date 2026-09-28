import { createMiddleware } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { requirePermission } from "@/lib/auth-utils.server"
import type { Permission } from "@/lib/workforce-policy"

export function adminPermissionMiddleware(permission: Permission) {
  return createMiddleware({ type: "function" }).server(async ({ next }) => {
    await requirePermission(getRequest(), permission)
    return next()
  })
}
