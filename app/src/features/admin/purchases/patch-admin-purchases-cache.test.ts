import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"
import {
  adminPurchasesQueryKeys,
  type AdminPurchasesInfinitePage,
} from "@/features/admin/purchases/admin-purchases-queries"
import type { PurchaseRow } from "@/features/admin/purchases/types"
import {
  patchAdminPurchasePages,
  patchAdminPurchaseStatusInCache,
} from "@/features/admin/purchases/patch-admin-purchases-cache"

function makePage(rows: PurchaseRow[], total = rows.length): AdminPurchasesInfinitePage {
  return {
    data: rows as AdminPurchasesInfinitePage["data"],
    total,
    hasMore: false,
    nextCursor: null,
  }
}

const sampleRow = {
  id: 10,
  status: "pending",
  customer_name: "Ana",
  customer_phone: "04120000000",
  raffle_name: "Rifa",
  ticket_quantity: 2,
  ticket_numbers: "0001,0002",
  total_amount: 100,
  payment_method: "pago_movil",
  payment_reference: "123",
  created_at: "2026-06-05T10:00:00.000Z",
} satisfies PurchaseRow

describe("patchAdminPurchasePages", () => {
  it("updates status in place for all-status lists", () => {
    const pages = [makePage([sampleRow])]
    const updated = patchAdminPurchasePages(pages, 10, "approved", {
      limit: 50,
      status: "all",
      paymentMethod: "all",
      raffleId: null,
      search: null,
      searchType: "all",
      start: null,
      end: null,
      sort: "newest",
    })

    expect(updated[0]?.data[0]?.status).toBe("approved")
    expect(updated[0]?.total).toBe(1)
  })

  it("removes approved purchases from pending-only lists", () => {
    const pages = [makePage([sampleRow, { ...sampleRow, id: 11 }], 2)]
    const updated = patchAdminPurchasePages(pages, 10, "approved", {
      limit: 50,
      status: "pending",
      paymentMethod: "all",
      raffleId: null,
      search: null,
      searchType: "all",
      start: null,
      end: null,
      sort: "oldest",
    })

    expect(updated[0]?.data.map((row) => row.id)).toEqual([11])
    expect(updated[0]?.total).toBe(1)
  })
})

describe("patchAdminPurchaseStatusInCache", () => {
  it("updates status in place for all-status lists", () => {
    const queryClient = new QueryClient()
    const filters = adminPurchasesQueryKeys.list({
      limit: 50,
      status: "all",
      paymentMethod: "all",
      raffleId: null,
      search: null,
      searchType: "all",
      start: null,
      end: null,
      sort: "newest",
    })

    queryClient.setQueryData(filters, {
      pages: [makePage([sampleRow])],
      pageParams: [null],
    })

    patchAdminPurchaseStatusInCache(queryClient, 10, "approved")

    const updated = queryClient.getQueryData<{ pages: AdminPurchasesInfinitePage[] }>(filters)
    expect(updated?.pages[0]?.data[0]?.status).toBe("approved")
    expect(updated?.pages[0]?.total).toBe(1)
  })

  it("removes approved purchases from pending-only lists", () => {
    const queryClient = new QueryClient()
    const filters = adminPurchasesQueryKeys.list({
      limit: 50,
      status: "pending",
      paymentMethod: "all",
      raffleId: null,
      search: null,
      searchType: "all",
      start: null,
      end: null,
      sort: "oldest",
    })

    queryClient.setQueryData(filters, {
      pages: [makePage([sampleRow, { ...sampleRow, id: 11 }], 2)],
      pageParams: [null],
    })

    patchAdminPurchaseStatusInCache(queryClient, 10, "approved")

    const updated = queryClient.getQueryData<{ pages: AdminPurchasesInfinitePage[] }>(filters)
    expect(updated?.pages[0]?.data.map((row) => row.id)).toEqual([11])
    expect(updated?.pages[0]?.total).toBe(1)
  })
})
