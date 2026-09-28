import { staffGrants, staffRoles } from "@raffle/shared/db"
import { createFileRoute } from "@tanstack/react-router"
import { eq } from "drizzle-orm"
import { apiHandlers } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-utils.server"
import { getDb } from "@/lib/db.server"
import { PERMISSIONS } from "@/lib/workforce-policy"
export const Route = createFileRoute("/api/admin/workforce/me")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        const user = await requireAuth(request)
        if (user.role === "super_admin") return Response.json({ permissions: PERMISSIONS })
        if (user.role === "admin")
          return Response.json({ permissions: PERMISSIONS.filter((p) => p !== "workforce.manage") })
        const [role] = await getDb()
          .select({ permissions: staffRoles.permissions })
          .from(staffRoles)
          .where(eq(staffRoles.id, user.role ?? ""))
          .limit(1)
        const grants = await getDb()
          .select({ permission: staffGrants.permission })
          .from(staffGrants)
          .where(eq(staffGrants.userId, String(user.id)))
        return Response.json({
          permissions: [
            ...new Set([
              ...(role ? (JSON.parse(role.permissions) as string[]) : []),
              ...grants.map((g) => g.permission),
            ]),
          ],
        })
      },
    }),
  },
})
