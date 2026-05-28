import { sql } from "drizzle-orm"
import { createFileRoute } from "@tanstack/react-router"
import { getDb } from "@/lib/db.server"

export const Route = createFileRoute("/api/health/db")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const db = getDb()
          const row = await db.get<{ ok: number }>(sql`SELECT 1 as ok`)

          return Response.json({ ok: true, db: row?.ok === 1 })
        } catch (error) {
          return Response.json(
            {
              ok: false,
              error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 503 },
          )
        }
      },
    },
  },
})
