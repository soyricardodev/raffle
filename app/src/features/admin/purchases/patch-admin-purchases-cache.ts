import type { InfiniteData, QueryClient } from "@tanstack/react-query"
import {
  parseAdminPurchasesListFilters,
  type AdminPurchaseListFilters,
  type AdminPurchasesInfinitePage,
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
  let removedCount = 0

  return pages.map((page, pageIndex) => {
    const data = page.data.flatMap((row) => {
      if (row.id !== purchaseId) return [row]
      if (!keepInList) {
        removedCount += 1
        return []
      }
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
    if (!old) continue

    const filters = parseAdminPurchasesListFilters(queryKey[2])
    const pages = patchAdminPurchasePages(old.pages, purchaseId, status, filters, notes)
    queryClient.setQueryData(queryKey, { ...old, pages })
  }

  void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard", "purchases"] })
}
