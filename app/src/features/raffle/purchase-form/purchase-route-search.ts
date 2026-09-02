import { z } from "zod"

function parseFlagSearch(value: unknown): boolean | undefined {
  if (value === true || value === 1) return true
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "1" || normalized === "true") return true
  }
  return undefined
}

const purchaseRouteSearchSchema = z.object({
  norecordar: z.unknown().optional().transform(parseFlagSearch),
  previewSuccess: z.unknown().optional().transform(parseFlagSearch),
  previewAvisos: z.unknown().optional().transform(parseFlagSearch),
})

export type PurchaseRouteSearch = {
  norecordar?: boolean
  previewSuccess?: boolean
  previewAvisos?: boolean
}

export function parsePurchaseRouteSearchInput(
  search: Record<string, unknown>,
): PurchaseRouteSearch {
  const parsed = purchaseRouteSearchSchema.parse(search)
  const result: PurchaseRouteSearch = {}
  if (parsed.norecordar === true) result.norecordar = true
  if (parsed.previewSuccess === true) result.previewSuccess = true
  if (parsed.previewAvisos === true) result.previewAvisos = true
  return result
}
