import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { recordBuyerPresence } from "@/server/live-activity.service"

const BuyerPresenceInput = z.object({
  raffleId: z.string().min(1),
  clientId: z.string().min(8).max(64),
})

export const sendBuyerPresenceHeartbeat = createServerFn({ method: "POST" })
  .inputValidator(BuyerPresenceInput)
  .handler(async ({ data }) => {
    await recordBuyerPresence(Number(data.raffleId), data.clientId)
    return { ok: true as const }
  })
