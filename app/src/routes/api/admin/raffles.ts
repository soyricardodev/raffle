import { createFileRoute } from "@tanstack/react-router"
import { getAllRaffles, createRaffle, updateRaffle, deleteRaffle, publishRaffle } from "@/server/raffle.service"
import { pauseRaffle, unpauseRaffle } from "@/server/pause.service"
import { requireAdmin, requireSuperAdmin } from "@/lib/auth-utils.server"
import { getPool } from "@/lib/db.server"

export const Route = createFileRoute("/api/admin/raffles")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await requireAdmin(request)
        const url = new URL(request.url)
        const status = url.searchParams.get("status") ?? undefined
        const limit = Number(url.searchParams.get("limit") || 50)
        const page = Number(url.searchParams.get("page") || 1)
        return Response.json(await getAllRaffles({ status, limit, page }))
      },
      POST: async ({ request }) => {
        await requireAdmin(request)
        const body = await request.json()
        const result = await createRaffle(body)
        return Response.json(result, { status: 201 })
      },
    },
  },
})

export const RaffleById = createFileRoute("/api/admin/raffles/$id")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const body = await request.json()
        const result = await updateRaffle(Number(params.id), body)
        return Response.json(result)
      },
      DELETE: async ({ request, params }) => {
        await requireSuperAdmin(request)
        const result = await deleteRaffle(Number(params.id))
        return Response.json(result)
      },
    },
  },
})

export const Pause = createFileRoute("/api/admin/raffles/$id/pause")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        await requireAdmin(request)
        const result = await pauseRaffle(Number(params.id), "manual")
        return Response.json(result)
      },
    },
  },
})

export const Unpause = createFileRoute("/api/admin/raffles/$id/unpause")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        await requireAdmin(request)
        const result = await unpauseRaffle(Number(params.id))
        return Response.json(result)
      },
    },
  },
})

export const AutoPause = createFileRoute("/api/admin/raffles/$id/auto-pause")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const pool = getPool()
        const body = await request.json() as { enabled: boolean }
        await pool.execute(
          "UPDATE raffles SET auto_pause_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [body.enabled, Number(params.id)],
        )
        return Response.json({ autoPauseEnabled: body.enabled })
      },
    },
  },
})

export const Publish = createFileRoute("/api/admin/raffles/$id/publish")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const body = await request.json() as { publish: boolean }
        const result = await publishRaffle(Number(params.id), body.publish)
        return Response.json(result)
      },
    },
  },
})
