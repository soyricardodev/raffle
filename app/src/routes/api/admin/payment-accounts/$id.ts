import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin } from "@/lib/auth-utils.server"
import {
  getPaymentAccount,
  removePaymentAccount,
  updatePaymentAccount,
} from "@/server/payment-accounts.service"

export const Route = createFileRoute("/api/admin/payment-accounts/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        await requireAdmin(request)
        const id = Number(params.id)
        return Response.json(await getPaymentAccount(id))
      },
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const id = Number(params.id)
        const body = await request.json()
        return Response.json(await updatePaymentAccount(id, body))
      },
      DELETE: async ({ request, params }) => {
        await requireAdmin(request)
        const id = Number(params.id)
        return Response.json(await removePaymentAccount(id))
      },
    },
  },
})
