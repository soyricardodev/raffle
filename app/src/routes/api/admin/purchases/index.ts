import { createFileRoute } from "@tanstack/react-router"
import { decodeAdminPurchaseCursor } from "@/server/admin-purchases-cursor"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { listAdminPurchases } from "@/server/purchase.service"

export const Route = createFileRoute("/api/admin/purchases/")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        await requireAdmin(request)
        const url = new URL(request.url)
        const cursorParam = url.searchParams.get("cursor")
        const pageParam = url.searchParams.get("page")
        const cursor = decodeAdminPurchaseCursor(cursorParam)
        const page =
          pageParam != null && pageParam !== "" && cursorParam == null
            ? Number(pageParam) || 1
            : undefined

        const result = await listAdminPurchases({
          limit: Number(url.searchParams.get("limit") || 50),
          cursor,
          page,
          status: url.searchParams.get("status") ?? "all",
          paymentMethod: url.searchParams.get("payment_method") ?? "all",
          raffleId: url.searchParams.get("raffle_id"),
          search: url.searchParams.get("search"),
          searchType: url.searchParams.get("search_type") ?? "all",
          start: url.searchParams.get("start"),
          end: url.searchParams.get("end"),
          sort: url.searchParams.get("sort") === "oldest" ? "oldest" : "newest",
        })

        return Response.json(result)
      },
    }),
  },
})
