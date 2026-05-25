import { createFileRoute } from "@tanstack/react-router"
import { findFirstActiveRaffle } from "@/server/raffle.service"

export const Route = createFileRoute("/api/raffles/first-active")({
  server: {
    handlers: {
      GET: async () => Response.json(await findFirstActiveRaffle()),
    },
  },
})
