import { describe, expect, it } from "vitest"
import { adminNavItems, firstAccessibleAdminPage, permissionForAdminPage } from "./nav"

describe("operator navigation", () => {
  const permissions = [
    "purchases.read",
    "purchases.approve",
    "purchases.reject",
    "purchases.reverse",
  ]

  it("offers only Compras and Buscar boleto and lands on Compras", () => {
    expect(
      adminNavItems
        .filter((item) => permissions.includes(item.permission))
        .map((item) => item.href),
    ).toEqual(["/admin/compras", "/admin/boletos"])
    expect(firstAccessibleAdminPage(permissions)).toBe("/admin/compras")
  })

  it("requires permissions for direct navigation to other sections", () => {
    expect(permissionForAdminPage("/admin")).toBe("dashboard.read")
    expect(permissionForAdminPage("/admin/rifas/42")).toBe("raffles.read")
    expect(permissionForAdminPage("/admin/analytics")).toBe("analytics.read")
    expect(permissionForAdminPage("/admin/compras")).toBe("purchases.read")
    expect(permissionForAdminPage("/admin/boletos")).toBe("purchases.read")
    expect(permissionForAdminPage("/admin/cuenta")).toBeNull()
  })
})
