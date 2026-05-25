import { createFileRoute } from "@tanstack/react-router"
import { getFirstActiveRaffle } from "@/server/raffle.service"

export const Route = createFileRoute("/api/raffles/first-active")({
  server: {
    handlers: {
      GET: async () => Response.json(await getFirstActiveRaffle()),
    },
  },
})
