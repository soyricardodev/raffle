import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin } from "@/lib/auth-utils.server"
import {
  deleteRafflePromotion,
  updateRafflePromotion,
} from "@/server/raffle-promotions.service"
import { UpdateRafflePromotionInput } from "@raffle/shared/validators"
import { ValidationError } from "@raffle/shared/errors"

export const Route = createFileRoute(
  "/api/admin/raffles/$id/promotions/$promotionId",
)({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const parsed = UpdateRafflePromotionInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError(
            "Datos de promoción inválidos",
            parsed.error.flatten().fieldErrors,
          )
        }
        return Response.json(
          await updateRafflePromotion(
            Number(params.id),
            Number(params.promotionId),
            parsed.data,
          ),
        )
      },
      DELETE: async ({ request, params }) => {
        await requireAdmin(request)
        return Response.json(
          await deleteRafflePromotion(Number(params.id), Number(params.promotionId)),
        )
      },
    },
  },
})
