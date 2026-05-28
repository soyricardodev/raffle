import { createFileRoute } from "@tanstack/react-router"
import { createPurchase } from "@/server/purchase.service"
import { sendPurchaseConfirmationEmail } from "@/server/purchase-notifications"
import { ValidationError } from "@raffle/shared/errors"
import { rateLimit } from "@/lib/rate-limit"
import { savePaymentProof } from "@/lib/upload.server"
import { parsePurchaseFromFormData, parsePurchaseFromJson } from "@/lib/parse-create-purchase"
import { ZodError } from "zod"

export const Route = createFileRoute("/api/purchases/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await rateLimit(request, { windowMs: 10_000, maxRequests: 5, keyPrefix: "purchase" })

        const contentType = request.headers.get("content-type") ?? ""

        try {
          if (contentType.includes("multipart/form-data")) {
            const form = await request.formData()
            const proofFile = form.get("paymentProof")
            let paymentProofUrl: string | null = null
            if (proofFile instanceof File && proofFile.size > 0) {
              paymentProofUrl = await savePaymentProof(proofFile)
            }

            const params = parsePurchaseFromFormData(form)
            const result = await createPurchase({ ...params, paymentProofUrl })
            void sendPurchaseConfirmationEmail(result.purchaseId)
            return Response.json(result, { status: 201 })
          }

          const json = (await request.json()) as Record<string, unknown>
          const params = parsePurchaseFromJson(json)
          const result = await createPurchase(params)
          void sendPurchaseConfirmationEmail(result.purchaseId)
          return Response.json(result, { status: 201 })
        } catch (error) {
          if (error instanceof ZodError) {
            const first = error.issues[0]?.message ?? "Datos de compra inválidos"
            throw new ValidationError(first)
          }
          throw error
        }
      },
    },
  },
})
