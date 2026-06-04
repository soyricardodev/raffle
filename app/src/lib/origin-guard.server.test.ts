import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { resetEnvCache } from "./env"
import { assertSameOriginMutation } from "./origin-guard.server"

describe("assertSameOriginMutation", () => {
  const prev = { ...process.env }

  beforeEach(() => {
    process.env.NODE_ENV = "production"
    process.env.DATABASE_URL = "file::memory:"
    process.env.DISABLE_ORIGIN_GUARD = undefined
    process.env.APP_URL = "http://localhost:3000"
    process.env.BETTER_AUTH_URL = "http://localhost:3000"
    resetEnvCache()
  })

  afterEach(() => {
    process.env = { ...prev }
    resetEnvCache()
  })

  it("allows matching Origin", () => {
    const req = new Request("http://localhost/api/admin/purchases/1/status", {
      method: "PUT",
      headers: { origin: "http://localhost:3000" },
    })
    expect(() => assertSameOriginMutation(req)).not.toThrow()
  })

  it("blocks foreign Origin", () => {
    const req = new Request("http://localhost/api/admin/purchases/1/status", {
      method: "PUT",
      headers: { origin: "https://evil.example" },
    })
    expect(() => assertSameOriginMutation(req)).toThrow()
  })

  it("skips in test env", () => {
    process.env.NODE_ENV = "test"
    const req = new Request("http://localhost/api/admin/purchases/1/status", {
      method: "PUT",
    })
    expect(() => assertSameOriginMutation(req)).not.toThrow()
  })
})
