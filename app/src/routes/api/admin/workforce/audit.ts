import { auditEvents, users } from "@raffle/shared/db"
import { createFileRoute } from "@tanstack/react-router"
import { and, desc, eq, lt, type SQL } from "drizzle-orm"
import { apiHandlers } from "@/lib/api-handler"
import { requirePermission } from "@/lib/auth-utils.server"
import { getDb } from "@/lib/db.server"
export const Route = createFileRoute("/api/admin/workforce/audit")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        await requirePermission(request, "workforce.read")
        const url = new URL(request.url)
        const conditions: SQL[] = []
        const userId = url.searchParams.get("userId")
        const raffleId = Number(url.searchParams.get("raffleId"))
        const before = Number(url.searchParams.get("before"))
        if (Number.isSafeInteger(before) && before > 0) conditions.push(lt(auditEvents.id, before))
        if (userId) conditions.push(eq(auditEvents.actorUserId, userId))
        if (raffleId > 0) conditions.push(eq(auditEvents.raffleId, raffleId))
        const rows = await getDb()
          .select({
            id: auditEvents.id,
            actorUserId: auditEvents.actorUserId,
            actorName: users.displayName,
            raffleId: auditEvents.raffleId,
            purchaseId: auditEvents.purchaseId,
            action: auditEvents.action,
            payload: auditEvents.payload,
            createdAt: auditEvents.createdAt,
          })
          .from(auditEvents)
          .leftJoin(users, eq(users.id, auditEvents.actorUserId))
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(auditEvents.id))
          .limit(100)
        return Response.json(rows)
      },
    }),
  },
})
