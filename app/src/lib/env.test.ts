import { afterEach, describe, expect, it } from "vitest"
import { getEnv, resetEnvCache } from "./env"

describe("getEnv", () => {
  afterEach(() => {
    resetEnvCache()
  })

  it("throws when DATABASE_URL is missing", () => {
    resetEnvCache()
    const previous = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    expect(() => getEnv()).toThrow(/DATABASE_URL/)
    process.env.DATABASE_URL = previous
  })

  it("parses valid minimal env", () => {
    process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/raffle_db"
    process.env.NODE_ENV = "test"
    process.env.EMAIL_PROVIDER = "noop"
    const parsed = getEnv()
    expect(parsed.DATABASE_URL).toContain("mysql://")
    expect(parsed.EMAIL_PROVIDER).toBe("noop")
  })
})
