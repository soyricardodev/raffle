import { describe, expect, it } from "vitest"
import { hasGrant, permissionForAdminRequest } from "./workforce-policy"

describe("workforce policy", () => {
  it("denies unmapped admin endpoints", () => {
    expect(permissionForAdminRequest("POST", "/api/admin/new-unsafe-route")).toBeNull()
  })
  it("splits purchase changes into distinct actions", () => {
    expect(permissionForAdminRequest("GET", "/api/admin/me/preferences")).toBe("purchases.read")
    expect(permissionForAdminRequest("PUT", "/api/admin/purchases/5/tickets/add")).toBe(
      "purchases.tickets.add",
    )
    expect(permissionForAdminRequest("PUT", "/api/admin/purchases/5/tickets/remove")).toBe(
      "purchases.tickets.remove",
    )
    expect(permissionForAdminRequest("PUT", "/api/admin/purchases/5/customer")).toBe(
      "purchases.customer.edit",
    )
    expect(permissionForAdminRequest("POST", "/api/admin/purchases/5/emails/send")).toBe(
      "emails.manage",
    )
  })
  it("keeps the built-in operator inside purchase capabilities despite stale grants", () => {
    const input = {
      role: "operator",
      rolePermissions: ["dashboard.read", "raffles.read", "purchases.read"],
      grants: [{ permission: "settings.read", raffleId: null }],
    }
    expect(hasGrant({ ...input, permission: "purchases.read" })).toBe(true)
    expect(hasGrant({ ...input, permission: "dashboard.read" })).toBe(false)
    expect(hasGrant({ ...input, permission: "raffles.read" })).toBe(false)
    expect(hasGrant({ ...input, permission: "settings.read" })).toBe(false)
  })
  it("respects raffle-scoped grants without broadening them", () => {
    const input = {
      role: "verifier",
      rolePermissions: [] as string[],
      grants: [{ permission: "purchases.approve", raffleId: 42 }],
    }
    expect(hasGrant({ ...input, permission: "purchases.approve", raffleId: 42 })).toBe(true)
    expect(hasGrant({ ...input, permission: "purchases.approve", raffleId: 43 })).toBe(false)
    expect(hasGrant({ ...input, permission: "purchases.reject", raffleId: 42 })).toBe(false)
    expect(hasGrant({ ...input, permission: "purchases.approve" })).toBe(false)
  })
  it("always lets super_admin through and protects workforce management from legacy admin", () => {
    expect(
      hasGrant({
        role: "super_admin",
        rolePermissions: [],
        grants: [],
        permission: "workforce.manage",
      }),
    ).toBe(true)
    expect(
      hasGrant({ role: "admin", rolePermissions: [], grants: [], permission: "workforce.manage" }),
    ).toBe(false)
  })
})
