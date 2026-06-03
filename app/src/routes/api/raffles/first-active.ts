import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { findFirstActiveRaffle } from "@/server/raffle.service"

export const Route = createFileRoute("/api/raffles/first-active")({
  server: {
    handlers: apiHandlers({
      GET: async () => Response.json(await findFirstActiveRaffle()),
    }),
  },
})
