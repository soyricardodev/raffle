import { createFileRoute } from "@tanstack/react-router"
import { getRaffleById } from "@/server/raffle.service"

export const Route = createFileRoute("/api/raffles/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        return Response.json(await getRaffleById(Number(params.id)))
      },
    },
  },
})
