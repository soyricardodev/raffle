import { getRaffleById } from "@/server/raffle.service"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

export const raffleQueryKeys = {
  detail: (id: string) => ["raffle", id] as const,
}

const RaffleIdInput = z.object({
  id: z.string().min(1),
})

export const fetchRaffleById = createServerFn({ method: "POST" })
  .inputValidator(RaffleIdInput)
  .handler(async ({ data }) => {
    return getRaffleById(Number(data.id))
  })
