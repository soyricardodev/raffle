import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requirePermission } from "@/lib/auth-utils.server"
import { workforcePerformance } from "@/server/workforce.service"
export const Route = createFileRoute("/api/admin/workforce/performance")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        await requirePermission(request, "workforce.read")
        const url = new URL(request.url)
        const raffleIds = url.searchParams
          .getAll("raffleId")
          .map(Number)
          .filter((id) => Number.isSafeInteger(id) && id > 0)
        const days = Number(url.searchParams.get("days") ?? 30)
        return Response.json(await workforcePerformance(raffleIds, days))
      },
    }),
  },
})
