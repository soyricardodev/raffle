import { createFileRoute } from "@tanstack/react-router"
import { getPauseInfo } from "@/server/pause.service"

export const Route = createFileRoute("/api/raffles/$id/pause-info")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        return Response.json(await getPauseInfo(Number(params.id)))
      },
    },
  },
})
