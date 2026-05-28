import { createMiddleware } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { requireAdmin } from "@/lib/auth-utils.server"

export const requireAdminMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  await requireAdmin(getRequest())
  return next()
})
