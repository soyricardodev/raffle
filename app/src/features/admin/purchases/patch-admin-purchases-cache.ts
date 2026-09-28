import type { InfiniteData, QueryClient } from "@tanstack/react-query"
import {
  type AdminPurchaseListFilters,
  type AdminPurchasesInfinitePage,
  parseAdminPurchasesListFilters,
} from "@/features/admin/purchases/admin-purchases-queries"

function shouldKeepPurchaseInFilteredList(
  filters: AdminPurchaseListFilters | null,
  status: "approved" | "rejected",
) {
  if (!filters || filters.status === "all") return true
  return filters.status === status
}

export function patchAdminPurchasePages(
  pages: AdminPurchasesInfinitePage[],
  purchaseId: number,
  status: "approved" | "rejected",
  filters: AdminPurchaseListFilters | null,
  notes?: string,
): AdminPurchasesInfinitePage[] {
  const keepInList = shouldKeepPurchaseInFilteredList(filters, status)
  const removedCount = keepInList
    ? 0
    : pages.reduce(
        (count, page) => count + page.data.filter((row) => row.id === purchaseId).length,
        0,
      )

  return pages.map((page, pageIndex) => {
    const data = page.data.flatMap((row) => {
      if (row.id !== purchaseId) return [row]
      if (!keepInList) return []
      return [{ ...row, status, notes: notes ?? row.notes }]
    })

    if (pageIndex !== 0) return { ...page, data }

    const total = removedCount > 0 ? Math.max(0, page.total - removedCount) : page.total
    return { ...page, data, total }
  })
}

export function patchAdminPurchaseStatusInCache(
  queryClient: QueryClient,
  purchaseId: number,
  status: "approved" | "rejected",
  notes?: string,
) {
  const queries = queryClient.getQueriesData<InfiniteData<AdminPurchasesInfinitePage>>({
    queryKey: ["admin", "purchases"],
  })

  for (const [queryKey, old] of queries) {
    const filters = parseAdminPurchasesListFilters(queryKey[2])
    // The same prefix also includes raffle-scope and other non-infinite queries.
    if (!filters || !old || !Array.isArray(old.pages)) continue
    const pages = patchAdminPurchasePages(old.pages, purchaseId, status, filters, notes)
    queryClient.setQueryData(queryKey, { ...old, pages })
  }

  void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard", "purchases"] })
}
