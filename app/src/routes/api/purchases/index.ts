import { createFileRoute } from "@tanstack/react-router"
import { createPurchase } from "@/server/purchase.service"
import type { CreatePurchaseParams } from "@/server/purchase.service"
import { sendPurchaseConfirmationEmail } from "@/server/purchase-notifications"
import { ValidationError } from "@raffle/shared/errors"
import { rateLimit } from "@/lib/rate-limit"
import { savePaymentProof } from "@/lib/upload.server"
import type { PaymentMethod } from "@raffle/shared/validators"

export const Route = createFileRoute("/api/purchases/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await rateLimit(request, { windowMs: 10_000, maxRequests: 5, keyPrefix: "purchase" })

        const contentType = request.headers.get("content-type") ?? ""
        let body: CreatePurchaseParams

        if (contentType.includes("multipart/form-data")) {
          const form = await request.formData()
          const proofFile = form.get("paymentProof")
          let paymentProofUrl: string | null = null
          if (proofFile instanceof File && proofFile.size > 0) {
            paymentProofUrl = await savePaymentProof(proofFile)
          }

          body = {
            raffleId: Number(form.get("raffleId")),
            customerName: String(form.get("customerName") ?? ""),
            customerPhone: String(form.get("customerPhone") ?? ""),
            customerEmail: String(form.get("customerEmail") ?? "") || undefined,
            customerCi: String(form.get("customerCi") ?? "") || undefined,
            customerLocation: String(form.get("customerLocation") ?? "") || null,
            paymentMethod: String(form.get("paymentMethod") ?? "") as PaymentMethod,
            paymentReference: String(form.get("paymentReference") ?? ""),
            ticketQuantity: Number(form.get("ticketQuantity")),
            paymentProofUrl,
          }
        } else {
          body = (await request.json()) as CreatePurchaseParams
        }

        if (!body.raffleId || !body.customerName || !body.customerPhone || !body.paymentMethod) {
          throw new ValidationError("Campos requeridos faltantes")
        }

        const result = await createPurchase(body)
        void sendPurchaseConfirmationEmail(result.purchaseId)
        return Response.json(result, { status: 201 })
      },
    },
  },
})
