import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import {
  createPaymentAccount,
  listPaymentAccounts,
  reorderPaymentAccounts,
} from "@/server/payment-accounts.service"

export const Route = createFileRoute("/api/admin/payment-accounts/")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        await requireAdmin(request)
        const url = new URL(request.url)
        const activeOnly = url.searchParams.get("active") === "true"
        return Response.json(await listPaymentAccounts(activeOnly))
      },
      POST: async ({ request }) => {
        await requireAdmin(request)
        const body = await request.json()
        const result = await createPaymentAccount(body)
        return Response.json(result, { status: 201 })
      },
      PUT: async ({ request }) => {
        await requireAdmin(request)
        const body = await request.json()
        return Response.json(await reorderPaymentAccounts(body))
      },
    }),
  },
})
