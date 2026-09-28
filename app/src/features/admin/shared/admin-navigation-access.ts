import { UnauthorizedError } from "@raffle/shared/errors"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { requireAuth } from "@/lib/auth-utils.server"
import { navigationPermissionsForUser } from "@/lib/workforce-access.server"

export const fetchAdminNavigationPermissions = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      return await navigationPermissionsForUser(await requireAuth(getRequest()))
    } catch (error) {
      if (error instanceof UnauthorizedError) return null
      throw error
    }
  },
)
