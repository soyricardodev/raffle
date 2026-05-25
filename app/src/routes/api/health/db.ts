import { sql } from "drizzle-orm"
import { createFileRoute } from "@tanstack/react-router"
import { getDb } from "@/lib/db.server"

export const Route = createFileRoute("/api/health/db")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const db = getDb()
          const result = await db.execute(sql`SELECT 1 as ok`)
          const rows = result[0] as unknown as { ok: number }[]

          return Response.json({ ok: true, db: rows[0]?.ok === 1 })
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
