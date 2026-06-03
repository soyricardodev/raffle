import { ValidationError } from "@raffle/shared/errors"
import { apiHandlers } from "@/lib/api-handler"
import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin } from "@/lib/auth-utils.server"
import { type AdminImageKind, saveAdminImage } from "@/lib/upload.server"

const KINDS = new Set<AdminImageKind>(["raffles", "prizes", "site"])

export const Route = createFileRoute("/api/admin/upload")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request }) => {
        await requireAdmin(request)
        const form = await request.formData()
        const file = form.get("file")
        const kind = String(form.get("kind") ?? "raffles")

        if (!(file instanceof File) || file.size === 0) {
          throw new ValidationError("Archivo de imagen requerido")
        }
        if (!KINDS.has(kind as AdminImageKind)) {
          throw new ValidationError("Tipo de subida inválido")
        }

        const url = await saveAdminImage(file, kind as AdminImageKind)
        return Response.json({ url })
      },
    }),
  },
})
