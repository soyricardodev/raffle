import { afterEach, describe, expect, it } from "vitest"
import { getEnv, resetEnvCache } from "./env"

describe("getEnv", () => {
  afterEach(() => {
    resetEnvCache()
  })

  it("throws when DATABASE_URL is missing in production", () => {
    resetEnvCache()
    const previousUrl = process.env.DATABASE_URL
    const previousEnv = process.env.NODE_ENV
    delete process.env.DATABASE_URL
    process.env.NODE_ENV = "production"
    expect(() => getEnv()).toThrow(/DATABASE_URL/)
    process.env.DATABASE_URL = previousUrl
    process.env.NODE_ENV = previousEnv
  })

  it("allows missing DATABASE_URL outside production", () => {
    resetEnvCache()
    delete process.env.DATABASE_URL
    process.env.NODE_ENV = "development"
    const parsed = getEnv()
    expect(parsed.DATABASE_URL).toBeUndefined()
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
