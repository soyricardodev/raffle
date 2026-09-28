import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"
import {
  type AdminPurchasesInfinitePage,
  adminPurchasesQueryKeys,
} from "@/features/admin/purchases/admin-purchases-queries"
import {
  patchAdminPurchasePages,
  patchAdminPurchaseStatusInCache,
} from "@/features/admin/purchases/patch-admin-purchases-cache"
import type { PurchaseRow } from "@/features/admin/purchases/types"

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

  it("updates the total when the changed purchase is on a later page", () => {
    const pages = [makePage([{ ...sampleRow, id: 11 }], 2), makePage([sampleRow], 2)]
    const updated = patchAdminPurchasePages(pages, 10, "approved", {
      limit: 1,
      status: "pending",
      paymentMethod: "all",
      raffleId: null,
      search: null,
      searchType: "all",
      start: null,
      end: null,
      sort: "newest",
    })

    expect(updated[0]?.total).toBe(1)
    expect(updated[1]?.data).toEqual([])
  })
})

describe("patchAdminPurchaseStatusInCache", () => {
  it("ignores raffle-scope data while updating the list after approval", () => {
    const queryClient = new QueryClient()
    const listKey = adminPurchasesQueryKeys.list({
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
    const scope = { filter_raffles: [{ id: 1, name: "Rifa", status: "active" }] }
    queryClient.setQueryData(adminPurchasesQueryKeys.raffleScope, scope)
    queryClient.setQueryData(listKey, { pages: [makePage([sampleRow])], pageParams: [null] })

    expect(() => patchAdminPurchaseStatusInCache(queryClient, 10, "approved")).not.toThrow()
    expect(queryClient.getQueryData(adminPurchasesQueryKeys.raffleScope)).toEqual(scope)
    expect(
      queryClient.getQueryData<{ pages: AdminPurchasesInfinitePage[] }>(listKey)?.pages[0]?.data[0]
        ?.status,
    ).toBe("approved")
  })

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
