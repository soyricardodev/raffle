import { z } from "zod"

const AdminPurchaseCursorPayload = z.object({
  t: z.number().int().positive(),
  i: z.number().int().positive(),
})

export type AdminPurchaseListCursor = {
  createdAtMs: number
  id: number
}

export function encodeAdminPurchaseCursor(cursor: AdminPurchaseListCursor): string {
  const json = JSON.stringify({ t: cursor.createdAtMs, i: cursor.id })
  return Buffer.from(json, "utf8").toString("base64url")
}

export function decodeAdminPurchaseCursor(encoded: string | null | undefined): AdminPurchaseListCursor | null {
  if (!encoded?.trim()) return null
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8")
    const parsed = AdminPurchaseCursorPayload.parse(JSON.parse(json))
    return { createdAtMs: parsed.t, id: parsed.i }
  } catch {
    return null
  }
}

export function adminPurchaseCursorFromRow(row: {
  created_at: string | Date
  id: number
}): AdminPurchaseListCursor {
  const createdAtMs =
    row.created_at instanceof Date ? row.created_at.getTime() : new Date(row.created_at).getTime()
  return { createdAtMs, id: row.id }
}
