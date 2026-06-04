import { afterEach, describe, expect, it } from "vitest"
import { assertJsonPurchaseAllowed } from "./purchase-api.server"

describe("assertJsonPurchaseAllowed", () => {
  const prev = { ...process.env }

  afterEach(() => {
    process.env = { ...prev }
  })

  it("allows JSON in development", () => {
    process.env.NODE_ENV = "development"
    delete process.env.ALLOW_JSON_PURCHASE
    expect(() =>
      assertJsonPurchaseAllowed(new Request("http://localhost/api/purchases")),
    ).not.toThrow()
  })

  it("blocks JSON in production without opt-in", () => {
    process.env.NODE_ENV = "production"
    delete process.env.ALLOW_JSON_PURCHASE
    delete process.env.LOAD_TEST_SECRET
    expect(() =>
      assertJsonPurchaseAllowed(new Request("http://localhost/api/purchases")),
    ).toThrow(/multipart/)
  })

  it("allows JSON in production when ALLOW_JSON_PURCHASE=1", () => {
    process.env.NODE_ENV = "production"
    process.env.ALLOW_JSON_PURCHASE = "1"
    expect(() =>
      assertJsonPurchaseAllowed(new Request("http://localhost/api/purchases")),
    ).not.toThrow()
  })

  it("allows JSON in production with load-test secret header", () => {
    process.env.NODE_ENV = "production"
    delete process.env.ALLOW_JSON_PURCHASE
    process.env.LOAD_TEST_SECRET = "test-secret"
    const req = new Request("http://localhost/api/purchases", {
      headers: { "x-load-test-secret": "test-secret" },
    })
    expect(() => assertJsonPurchaseAllowed(req)).not.toThrow()
  })
})
