import { createFileRoute } from "@tanstack/react-router"
import { getPool } from "@/lib/db.server"
import { rateLimit } from "@/lib/rate-limit"

export const Route = createFileRoute("/api/config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await rateLimit(request, { windowMs: 60_000, maxRequests: 60, keyPrefix: "config" })
        const pool = getPool()
        const [rows] = await pool.execute("SELECT * FROM site_config ORDER BY config_key")
        const configs = rows as { config_key: string; config_value: unknown }[]
        const result: Record<string, unknown> = {}
        for (const c of configs) result[c.config_key] = c.config_value
        return Response.json(result)
      },
    },
  },
})
