import type { AdminEmailFilters } from "@/features/admin/emails/admin-emails-queries"

export function buildEmailExportUrl(filters: AdminEmailFilters): string {
  const params = new URLSearchParams()
  params.set("export", "csv")
  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.emailType && filters.emailType !== "all") params.set("type", filters.emailType)
  if (filters.search) params.set("q", filters.search)
  if (filters.start) params.set("start", filters.start)
  if (filters.end) params.set("end", filters.end)
  if (filters.purchaseId) params.set("purchase", String(filters.purchaseId))
  if (filters.sortBy) params.set("sortBy", filters.sortBy)
  if (filters.sortDir) params.set("sortDir", filters.sortDir)
  return `/api/admin/emails?${params.toString()}`
}

export type EmailExportResult = {
  truncated: boolean
  total?: number
}

export async function downloadEmailLogsCsv(
  filters: AdminEmailFilters,
): Promise<EmailExportResult> {
  const response = await fetch(buildEmailExportUrl(filters), { credentials: "include" })
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? "Error al exportar")
  }
  const truncated = response.headers.get("X-Export-Truncated") === "true"
  const totalHeader = response.headers.get("X-Export-Total")
  const total = totalHeader ? Number(totalHeader) : undefined

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `email-logs-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)

  return { truncated, total }
}
