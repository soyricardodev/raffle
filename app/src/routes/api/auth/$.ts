import { createFileRoute } from "@tanstack/react-router"
import { getAuth } from "@/lib/auth.server"

async function handleAuth({ request }: { request: Request }) {
  return getAuth().handler(request)
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handleAuth,
      POST: handleAuth,
      PUT: handleAuth,
      PATCH: handleAuth,
      DELETE: handleAuth,
    },
  },
})
