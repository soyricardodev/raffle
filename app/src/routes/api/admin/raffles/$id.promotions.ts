import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin } from "@/lib/auth-utils.server"
import {
  createRafflePromotion,
  listRafflePromotions,
} from "@/server/raffle-promotions.service"
import { CreateRafflePromotionInput } from "@raffle/shared/validators"
import { ValidationError } from "@raffle/shared/errors"

export const Route = createFileRoute("/api/admin/raffles/$id/promotions")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        await requireAdmin(request)
        return Response.json(await listRafflePromotions(Number(params.id)))
      },
      POST: async ({ request, params }) => {
        await requireAdmin(request)
        const parsed = CreateRafflePromotionInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError(
            "Datos de promoción inválidos",
            parsed.error.flatten().fieldErrors,
          )
        }
        return Response.json(await createRafflePromotion(Number(params.id), parsed.data))
      },
    },
  },
})
