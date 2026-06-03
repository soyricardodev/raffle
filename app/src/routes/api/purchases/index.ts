import { ValidationError } from "@raffle/shared/errors"
import { createFileRoute } from "@tanstack/react-router"
import { ZodError } from "zod"
import { apiErrorResponse } from "@/lib/api-error-response"
import { parsePurchaseFromFormData, parsePurchaseFromJson } from "@/lib/parse-create-purchase"
import { rateLimit } from "@/lib/rate-limit"
import { savePaymentProof } from "@/lib/upload.server"
import { createPurchase } from "@/server/purchase.service"
import { sendPurchaseConfirmationEmail } from "@/server/purchase-notifications"

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
            if (!(proofFile instanceof File) || proofFile.size <= 0) {
              throw new ValidationError("Sube el comprobante de pago")
            }
            const paymentProofUrl = await savePaymentProof(proofFile)

            const params = parsePurchaseFromFormData(form, paymentProofUrl)
            const result = await createPurchase(params)
            void sendPurchaseConfirmationEmail(result.purchaseId)
            return Response.json(result, { status: 201 })
          }

          const json = (await request.json()) as Record<string, unknown>
          if (!json.paymentProofUrl || String(json.paymentProofUrl).trim() === "") {
            throw new ValidationError("Comprobante de pago requerido")
          }
          const params = parsePurchaseFromJson(json)
          const result = await createPurchase(params)
          void sendPurchaseConfirmationEmail(result.purchaseId)
          return Response.json(result, { status: 201 })
        } catch (error) {
          if (error instanceof ZodError) {
            const first = error.issues[0]?.message ?? "Datos de compra inválidos"
            return apiErrorResponse(new ValidationError(first))
          }
          return apiErrorResponse(error)
        }
      },
    },
  },
})
