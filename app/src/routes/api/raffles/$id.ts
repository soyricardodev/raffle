import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { getRaffleById } from "@/server/raffle.service"

export const Route = createFileRoute("/api/raffles/$id")({
  server: {
    handlers: apiHandlers({
      GET: async ({ params }) => {
        return Response.json(await getRaffleById(Number(params.id)))
      },
    }),
  },
})
