import { createFileRoute } from "@tanstack/react-router"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { getEnv } from "@/lib/env"

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
}

export const Route = createFileRoute("/uploads/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const splat = (params as { _splat?: string })._splat ?? ""
        if (!splat || splat.includes("..")) {
          return new Response("Not found", { status: 404 })
        }

        const env = getEnv()
        const filePath = path.join(env.UPLOAD_DIR, splat)
        const resolved = path.resolve(filePath)
        const uploadRoot = path.resolve(env.UPLOAD_DIR)
        if (!resolved.startsWith(uploadRoot)) {
          return new Response("Forbidden", { status: 403 })
        }

        try {
          const data = await readFile(resolved)
          const ext = path.extname(resolved).toLowerCase()
          return new Response(data, {
            headers: {
              "Content-Type": MIME[ext] ?? "application/octet-stream",
              "Cache-Control": "public, max-age=86400",
            },
          })
        } catch {
          return new Response("Not found", { status: 404 })
        }
      },
    },
  },
})
